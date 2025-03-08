import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import path from 'path';
import http from 'http';
import { Api } from 'telegram';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import jwt from 'jsonwebtoken';
import { Types } from './types';
import { generateStatusMessage, generateCodeForm, generateHtml } from './template';

// Load environment variables
dotenv.config();

// Type Declarations
declare global {
  var codeCallback: ((code: string) => void) | undefined;
  var passwordCallback: ((password: string) => void) | undefined;
  var rateLimitInfo: { minutes: number } | null | undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

// Configuration
const config: Types.Config = {
  port: process.env.PORT || '3000',
  telegramApiId: parseInt(process.env.TELEGRAM_API_ID || '0', 10),
  telegramApiHash: process.env.TELEGRAM_API_HASH || '',
  telegramPhone: process.env.TELEGRAM_PHONE || '',
  jwtSecret: process.env.JWT_SECRET || '',
};

// Constants
const SESSION_DIR = path.join(__dirname, '../sessions');

// Helper Functions
function validateConfig(): void {
  if (!config.telegramApiId) throw new Error('TELEGRAM_API_ID is required');
  if (!config.telegramApiHash) throw new Error('TELEGRAM_API_HASH is required');
  if (!config.telegramPhone) throw new Error('TELEGRAM_PHONE is required');
  if (!config.jwtSecret) throw new Error('JWT_SECRET is required');
}

// Create sessions directory if it doesn't exist
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Telegram Client Setup
let client: TelegramClient | null = null;

async function setupTelegramClient() {
  try {
    let shouldUseSavedSession = true;
    client = new TelegramClient(
      new StringSession(process.env.TELEGRAM_SESSION || ''),
      config.telegramApiId,
      config.telegramApiHash,
      {
        connectionRetries: 5,
      }
    );
    
    try {
      await client.connect();
      const isAuthorized = await client.isUserAuthorized();
      
      if (isAuthorized) {
        return client;
      }
    } catch (error: any) {
      console.error('Error connecting with existing session:', error);
      shouldUseSavedSession = false;
      
      try {
        await client.disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting client:', disconnectError);
      }
      
      client = new TelegramClient(
        new StringSession(''),
        config.telegramApiId,
        config.telegramApiHash,
        {
          connectionRetries: 5,
        }
      );
      
      if (error.code === 420) {
        throw error;
      }
    }

    if (!shouldUseSavedSession) {
      try {
        await client.connect();
      } catch (error) {
        console.error('Error connecting with fresh session:', error);
        throw error;
      }
    }

    await client.start({
      phoneNumber: config.telegramPhone,
      phoneCode: async () => {
        return new Promise((resolve) => {
          global.codeCallback = resolve;
        });
      },
      password: async () => {
        return new Promise((resolve) => {
          global.passwordCallback = resolve;
        });
      },
      onError: (err) => {
        console.error('Telegram client error:', err);
        throw err;
      },
    });
    
    const newSessionString = client.session.save() as unknown as string;
    console.log('\n=== TELEGRAM SESSION STRING ===');
    console.log(newSessionString);
    console.log('=== END SESSION STRING ===\n');

    return client;
  } catch (error: any) {
    if (error.code === 420) {
      const waitSeconds = error.seconds || 0;
      const waitMinutes = Math.ceil(waitSeconds / 60);
      console.error(`Telegram rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`);
      global.rateLimitInfo = { minutes: waitMinutes };
      throw error;
    }
    console.error('Failed to initialize Telegram client:', error);
    client = null;
    return null;
  }
}

// Express Application Setup
const app = express();

// Security Middleware
const enforceHTTPS = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
};

const addSecurityHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// Apply middleware
app.use(enforceHTTPS);
app.use(addSecurityHeaders);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 30, // 30 requests per second (to stay safely within Telegram's limits)
  standardHeaders: true,
  message: { success: false, error: 'Rate limit exceeded. Telegram allows up to 30 requests per second.' }
});
app.use(limiter);

// Authentication Middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication token required' });
  }

  if (token !== config.jwtSecret) {
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }

  next();
};

// Routes
app.post('/auth/telegram/verify', async (req, res) => {
  const { code, password } = req.body;

  try {
    // Handle 2FA password submission
    if (password && global.passwordCallback) {
      global.passwordCallback(password);
      const token = jwt.sign({ authorized: true }, config.jwtSecret, { expiresIn: '24h' });
      
      // Print session string after successful 2FA
      if (client) {
        const sessionString = client.session.save() as unknown as string;
        console.log('\n=== TELEGRAM SESSION STRING ===');
        console.log(sessionString);
        console.log('=== END SESSION STRING ===\n');
        console.log('Copy this session string and set it as TELEGRAM_SESSION in your environment variables');
      }
      
      res.redirect('/?success=Authentication successful');
      return;
    }

    // Handle verification code submission
    if (code && global.codeCallback) {
      global.codeCallback(code);
      res.redirect('/?success=Code accepted. Please enter 2FA password if prompted.');
      return;
    }

    res.redirect('/?error=No pending authentication');
  } catch (error: any) {
    console.error('Verification error:', error);
    if (error.code === 420) { // FloodWaitError
      const waitSeconds = error.seconds || 0;
      const waitMinutes = Math.ceil(waitSeconds / 60);
      res.redirect(`/?error=Telegram rate limit exceeded&rateLimitMinutes=${waitMinutes}`);
      return;
    }
    res.redirect(`/?error=${encodeURIComponent('Verification failed')}`);
  }
});

app.post('/auth/telegram/restart', async (req, res) => {
  try {
    // Reset all state
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
    
    // Clear all global state and session
    client = null;
    global.codeCallback = undefined;
    global.passwordCallback = undefined;
    global.rateLimitInfo = null;
    process.env.TELEGRAM_SESSION = '';

    // Start new client setup with forced fresh authentication
    try {
      console.log('Starting fresh authentication...');
      const telegramClient = await setupTelegramClient();
      
      // Verify the client was created and assigned properly
      if (!client || !telegramClient) {
        console.error('Failed to initialize Telegram client properly');
        res.redirect('/?error=Failed to initialize Telegram client');
        return;
      }

      if (!global.codeCallback) {
        console.error('Authentication callbacks not properly set up');
        res.redirect('/?error=Authentication system not ready. Please try again.');
        return;
      }

      console.log('Telegram client restarted, waiting for verification code...');
      res.redirect('/?success=Please enter the verification code sent to your Telegram');
      
    } catch (error: any) {
      console.error('Error restarting Telegram client:', error);
      if (error.code === 420) {
        const waitSeconds = error.seconds || 0;
        const waitMinutes = Math.ceil(waitSeconds / 60);
        res.redirect(`/?error=Telegram rate limit exceeded&rateLimitMinutes=${waitMinutes}`);
      } else {
        res.redirect(`/?error=${encodeURIComponent(error.message || 'Failed to restart authentication')}`);
      }
    }
  } catch (error: any) {
    console.error('Error in restart endpoint:', error);
    res.redirect('/?error=Failed to process restart request');
  }
});

app.get('/api/telegram/chats', authenticateToken, async (req, res) => {
  if (!client) {
    return res.status(503).json({ 
      success: false, 
      error: 'Telegram service temporarily unavailable' 
    } as Types.ApiResponse);
  }

  try {
    const dialogs = await client.getDialogs({});
    const chats: Types.Chat[] = await Promise.all(
      dialogs.map(async dialog => {
        let avatar: string | undefined;
        
        // Only set the avatar URL if we have a valid dialog ID
        if (dialog.id) {
          avatar = `/api/telegram/photo/${dialog.id}`;
        }

        return {
          id: dialog.id?.toString() || '',
          name: dialog.title || '',
          type: dialog.isUser ? 'user' : dialog.isGroup ? 'group' : 'channel',
          unreadCount: dialog.unreadCount,
          avatar
        };
      })
    );

    res.json({ 
      success: true, 
      data: chats 
    } as Types.ApiResponse<Types.Chat[]>);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    if (error.code === 420) { // FloodWaitError
      const waitSeconds = error.seconds || 0;
      const waitMinutes = Math.ceil(waitSeconds / 60);
      return res.status(429).json({ 
        success: false, 
        error: `Telegram rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`,
        retryAfter: waitSeconds
      } as Types.ApiResponse);
    }
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch chats' 
    } as Types.ApiResponse);
  }
});

app.get('/api/telegram/messages', authenticateToken, async (req, res) => {
  if (!client) {
    return res.status(503).json({ 
      success: false, 
      error: 'Telegram service temporarily unavailable' 
    } as Types.ApiResponse);
  }

  const chatId = req.query.chatId as string;
  const limit = parseInt(req.query.limit as string || '50', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);
  const messageIds = req.query.ids ? (req.query.ids as string).split(',').map(id => parseInt(id, 10)) : undefined;
  const fromMessageId = req.query.fromMessageId ? parseInt(req.query.fromMessageId as string, 10) : undefined;
  const direction = req.query.direction as 'before' | 'after' | undefined;

  if (!chatId && !messageIds) {
    return res.status(400).json({ 
      success: false, 
      error: 'Either chatId or message ids are required' 
    } as Types.ApiResponse);
  }

  try {
    let messages: any[] = [];
    
    // Validate chat ID format
    if (chatId && !/^-?\d+$/.test(chatId)) {
      return res.status(500).json({ 
        success: false, 
        error: 'Invalid chat ID format' 
      } as Types.ApiResponse);
    }

    if (messageIds) {
      // Fetch specific messages by IDs
      messages = await client.getMessages(chatId, {
        ids: messageIds
      });
    } else if (fromMessageId && direction) {
      if (direction === 'before') {
        messages = await client.getMessages(chatId, {
          limit,
          offsetId: fromMessageId,
          addOffset: 1
        });
      } else {
        messages = await client.getMessages(chatId, {
          limit,
          minId: fromMessageId,
          addOffset: 1
        });
      }
    } else {
      messages = await client.getMessages(chatId, {
        limit,
        offsetId: offset
      });
    }

    if (fromMessageId && fromMessageId > 1000000) {
      messages = [];
    }

    const formattedMessages: Types.Message[] = messages.map(msg => {
      // Helper function to format peer ID
      const formatPeerId = (peer: any): Types.PeerId | string | null => {
        if (!peer) return null;
        if (typeof peer === 'string' || typeof peer === 'number') return peer.toString();
        
        // Handle different peer types
        if ('userId' in peer) {
          return { _: 'peerUser', userId: peer.userId.toString() };
        }
        if ('channelId' in peer) {
          return { _: 'peerChannel', channelId: peer.channelId.toString() };
        }
        if ('chatId' in peer) {
          return { _: 'peerChat', chatId: peer.chatId.toString() };
        }
        
        return null;
      };

      return {
        id: msg.id,
        text: msg.text,
        date: new Date(msg.date * 1000).toISOString(),
        fromId: formatPeerId(msg.fromId || msg.senderId),
        replyTo: msg.replyTo?.replyToMsgId,
        forward: msg.fwdFrom ? {
          fromId: formatPeerId(msg.fwdFrom.fromId),
          date: new Date(msg.fwdFrom.date * 1000).toISOString()
        } : undefined,
        views: msg.views ? (typeof msg.views === 'object' ? parseInt(msg.views.toString(), 10) || 0 : msg.views) : 0,
        editDate: msg.editDate ? new Date(msg.editDate * 1000).toISOString() : undefined
      };
    });

    res.json({ 
      success: true, 
      data: formattedMessages 
    } as Types.ApiResponse<Types.Message[]>);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    if (error.code === 420) { // FloodWaitError
      const waitSeconds = error.seconds || 0;
      const waitMinutes = Math.ceil(waitSeconds / 60);
      return res.status(429).json({ 
        success: false, 
        error: `Telegram rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`,
        retryAfter: waitSeconds
      } as Types.ApiResponse);
    }
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch messages' 
    } as Types.ApiResponse);
  }
});

// Add a new endpoint to serve photos
app.get('/api/telegram/photo/:chatId', authenticateToken, async (req, res) => {
  if (!client) {
    return res.status(503).json({ 
      success: false, 
      error: 'Telegram service temporarily unavailable' 
    } as Types.ApiResponse);
  }

  try {
    const chatId = req.params.chatId;
    const buffer = await client.downloadProfilePhoto(chatId, {
      isBig: false // Get smaller version for avatars
    });
    
    if (!buffer) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(buffer);
  } catch (error: any) {
    console.error('Error fetching photo:', error);
    if (error.code === 420) { // FloodWaitError
      const waitSeconds = error.seconds || 0;
      const waitMinutes = Math.ceil(waitSeconds / 60);
      return res.status(429).json({ 
        success: false, 
        error: `Telegram rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`,
        retryAfter: waitSeconds
      } as Types.ApiResponse);
    }
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch photo' 
    } as Types.ApiResponse);
  }
});

app.get('/api/health', authenticateToken, async (req, res) => {
  try {
    const status = {
      success: true,
      telegram: {
        available: client !== null,
        authenticated: false,
        timestamp: new Date().toISOString()
      }
    };

    if (client) {
      status.telegram.authenticated = await client.isUserAuthorized();
    }

    res.json(status);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      telegram: {
        available: false,
        authenticated: false,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Home page
app.get('/', async (req, res) => {
  const phoneNumber = config.telegramPhone;
  const maskedPhone = '*'.repeat(phoneNumber.length - 2) + phoneNumber.slice(-2);
  const error = req.query.error as string;
  const success = req.query.success as string;
  const rateLimitMinutes = req.query.rateLimitMinutes ? parseInt(req.query.rateLimitMinutes as string, 10) : undefined;

  let statusMessage;
  let showCodeForm = false;
  let needs2FA = false;

  // If we have rate limit info from query params or global state, show it
  if (rateLimitMinutes || global.rateLimitInfo) {
    const rateLimitInfo = rateLimitMinutes ? { minutes: rateLimitMinutes } : global.rateLimitInfo;
    statusMessage = generateStatusMessage(
      undefined,
      undefined,
      undefined,
      rateLimitInfo
    );
  } else if (!client) {
    statusMessage = generateStatusMessage(
      'Telegram client is not available.',
      undefined,
      undefined,
      null
    );
  } else {
    try {
      const isAuthorized = await client.isUserAuthorized();
      if (isAuthorized) {
        statusMessage = generateStatusMessage(
          undefined,
          'Telegram client is authenticated and ready to use.',
          undefined,
          null
        );
      } else {
        statusMessage = generateStatusMessage(error, success, maskedPhone, null);
        showCodeForm = true;
        needs2FA = global.passwordCallback !== undefined;
      }
    } catch (error: any) {
      console.error('Error checking authorization:', error);
      if (error.code === 420) {
        const waitSeconds = error.seconds || 0;
        const waitMinutes = Math.ceil(waitSeconds / 60);
        global.rateLimitInfo = { minutes: waitMinutes };
        statusMessage = generateStatusMessage(
          undefined,
          undefined,
          undefined,
          global.rateLimitInfo
        );
      } else {
        statusMessage = generateStatusMessage(
          'Error checking authorization status.',
          undefined,
          undefined,
          null
        );
      }
    }
  }

  const codeForm = showCodeForm ? generateCodeForm(true, needs2FA) : '';
  const html = generateHtml(statusMessage, codeForm);

  res.send(html);
});

// Error Handlers
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found'
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Server Startup
async function startServer() {
  try {
    console.log('Starting server initialization...');
    console.log('Validating configuration...');
    validateConfig();

    // Start server first
    const port = process.env.PORT || 3000;
    const isProduction = process.env.NODE_ENV === 'production';
    
    const startWebServer = () => {
      if (isProduction) {
        try {
          console.log('Starting in production mode...');
          const privateKey = fs.readFileSync('ssl/private.key', 'utf8');
          const certificate = fs.readFileSync('ssl/certificate.crt', 'utf8');
          const credentials = { key: privateKey, cert: certificate };
          
          const httpsServer = https.createServer(credentials, app);
          httpsServer.listen(port, () => {
            console.log(`HTTPS Server running on port ${port}`);
          });
        } catch (error) {
          console.error('Failed to start HTTPS server:', error);
          throw new Error('HTTPS is required in production. Please ensure SSL certificates are properly configured.');
        }
      } else {
        console.log('Starting in development mode...');
        const httpServer = http.createServer(app);
        httpServer.listen(port, () => {
          console.log(`HTTP Server running on port ${port} (Development Mode)`);
          console.log('Visit http://localhost:3000 to view the application');
        });
      }
    };

    // Start web server immediately
    startWebServer();

    // Setup Telegram client asynchronously
    console.log('Setting up Telegram client in background...');
    setupTelegramClient().then(telegramClient => {
      if (telegramClient) {
        console.log('Telegram client initialized successfully!');
        client = telegramClient;
      } else {
        console.log('Telegram client initialization pending. Please authenticate through the web interface.');
      }
    }).catch(error => {
      console.error('Error setting up Telegram client:', error);
      if (error.code === 420) {
        const waitSeconds = error.seconds || 0;
        const waitMinutes = Math.ceil(waitSeconds / 60);
        console.error(`Telegram rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`);
      }
      console.log('Telegram features will be limited until client is authenticated.');
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
console.log('Initializing application...');
startServer().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
}); 