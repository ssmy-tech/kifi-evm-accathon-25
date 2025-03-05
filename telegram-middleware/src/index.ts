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
    console.log('Initializing Telegram client...');
    
    // Try to load existing session
    const sessionPath = path.join(SESSION_DIR, `${config.telegramPhone.replace('+', '')}.session`);
    let sessionString = '';
    
    if (fs.existsSync(sessionPath)) {
      console.log('Found existing session, loading...');
      sessionString = fs.readFileSync(sessionPath, 'utf8');
      console.log('Session loaded from:', sessionPath);
    } else {
      console.log('No existing session found at:', sessionPath);
    }
    
    const session = new StringSession(sessionString);
    client = new TelegramClient(session, config.telegramApiId, config.telegramApiHash, {
      connectionRetries: 5,
    });

    console.log('Starting Telegram client...');
    
    try {
      await client.connect();
      const isAuthorized = await client.isUserAuthorized();
      
      if (isAuthorized) {
        console.log('Successfully loaded existing session');
        return client;
      }
    } catch (error) {
      console.log('Error connecting with existing session:', error);
    }

    console.log('Starting new authentication...');
    await client.start({
      phoneNumber: config.telegramPhone,
      phoneCode: async () => {
        console.log('Waiting for verification code...');
        return new Promise((resolve) => {
          global.codeCallback = resolve;
        });
      },
      onError: (err) => {
        console.error('Telegram client error:', err);
        throw err;
      },
    });
    
    // Save the new session
    const newSessionString = client.session.save() as unknown as string;
    fs.writeFileSync(sessionPath, newSessionString);
    console.log('New session saved to:', sessionPath);

    console.log('Telegram client initialized successfully!');
    return client;
  } catch (error: any) {
    if (error.code === 420) { // FloodWaitError
      const waitSeconds = error.seconds || 0;
      const waitMinutes = Math.ceil(waitSeconds / 60);
      console.error(`Telegram rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`);
      return null;
    }
    console.error('Failed to initialize Telegram client:', error);
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
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: 'Verification code is required' });
  }

  try {
    if (global.codeCallback) {
      global.codeCallback(code);
      const token = jwt.sign({ authorized: true }, config.jwtSecret, { expiresIn: '24h' });
      res.redirect('/?success=Authentication successful');
    } else {
      res.redirect('/?error=No pending authentication');
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.redirect(`/?error=${encodeURIComponent('Verification failed')}`);
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
  } catch (error) {
    console.error('Error fetching chats:', error);
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

  if (!chatId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Chat ID is required' 
    } as Types.ApiResponse);
  }

  try {
    const messages = await client.getMessages(chatId, {
      limit,
      offsetId: offset
    });

    const formattedMessages: Types.Message[] = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      date: new Date(msg.date * 1000).toISOString(),
      fromId: msg.fromId?.toString() || '',
      replyTo: msg.replyTo?.replyToMsgId
    }));

    res.json({ 
      success: true, 
      data: formattedMessages 
    } as Types.ApiResponse<Types.Message[]>);
  } catch (error) {
    console.error('Error fetching messages:', error);
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
  } catch (error) {
    console.error('Error fetching photo:', error);
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

  let statusMessage;
  let showCodeForm = false;

  if (!client) {
    statusMessage = generateStatusMessage(
      'Telegram client is not available. Please try again later.',
      undefined,
      undefined
    );
  } else {
    try {
      const isAuthorized = await client.isUserAuthorized();
      if (isAuthorized) {
        statusMessage = generateStatusMessage(
          undefined,
          'Telegram client is authenticated and ready to use.',
          undefined
        );
      } else {
        statusMessage = generateStatusMessage(error, success, maskedPhone);
        showCodeForm = true;
      }
    } catch (error) {
      console.error('Error checking authorization:', error);
      statusMessage = generateStatusMessage(
        'Error checking authorization status.',
        undefined,
        undefined
      );
    }
  }

  const codeForm = showCodeForm ? generateCodeForm(true) : '';
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

    console.log('Setting up Telegram client...');
    await setupTelegramClient();
    
    // Continue server startup even if Telegram client fails
    const port = process.env.PORT || 3000;
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      try {
        console.log('Starting in production mode...');
        const privateKey = fs.readFileSync('ssl/private.key', 'utf8');
        const certificate = fs.readFileSync('ssl/certificate.crt', 'utf8');
        const credentials = { key: privateKey, cert: certificate };
        
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port, () => {
          console.log(`HTTPS Server running on port ${port}`);
          console.log('Telegram sessions will be stored in:', SESSION_DIR);
          if (!client) {
            console.log('Warning: Telegram client is not available. Some features will be limited.');
          }
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
        console.log('Telegram sessions will be stored in:', SESSION_DIR);
        console.log('Visit http://localhost:3000 to view the application');
        if (!client) {
          console.log('Warning: Telegram client is not available. Some features will be limited.');
        }
      });
    }
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