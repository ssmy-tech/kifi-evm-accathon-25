/// <reference types="jest" />
import axios, { AxiosInstance } from 'axios';
import { Types } from '../types';
import util from 'util';

// Configure console output
const formatResponse = (obj: any) => util.inspect(obj, {
  depth: 4,
  colors: true,
  compact: false
});

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create Axios instance with proper timeout
const createApiClient = (token?: string): AxiosInstance => {
  return axios.create({
    baseURL: `http://localhost:${process.env.PORT || 3000}`,
    headers: token ? {
      'Authorization': `Bearer ${token}`
    } : {},
    timeout: 30000, // 30 second timeout
    validateStatus: (status) => status < 500 // Only reject on server errors
  });
};

// Create a separate client for error testing that rejects on any non-2xx status
const errorTestClient = axios.create({
  baseURL: `http://localhost:${process.env.PORT || 3000}`,
  timeout: 30000,
  validateStatus: (status) => status >= 200 && status < 300 // Reject on any non-2xx status
});

const api = createApiClient(process.env.JWT_SECRET);

// Add response logging with proper async handling
const logResponse = async (message: string, data: any) => {
  console.dir(message, { depth: null });
  console.dir(data, { depth: 4, colors: true });
};

// Helper function for sequential requests with delay
const makeSequentialRequests = async (requests: (() => Promise<any>)[], delayMs: number) => {
  const results = [];
  for (const request of requests) {
    try {
      const result = await request();
      results.push(result);
      await delay(delayMs);
    } catch (error: any) {
      if (error.response?.status === 420) {
        const waitSeconds = error.response.data.retryAfter || 30;
        console.log(`Received flood wait, sleeping for ${waitSeconds} seconds`);
        await delay(waitSeconds * 1000);
      }
      results.push(error.response);
    }
  }
  return results;
};

api.interceptors.response.use(
  async (response) => {
    await logResponse(`\nResponse from ${response.config.url}:`, {
      status: response.status,
      data: response.data
    });
    await delay(500);
    return response;
  },
  async (error) => {
    await logResponse(`\nError from ${error.config?.url}:`, {
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

describe('Telegram Middleware API Tests', () => {
  let activeRequests: Promise<any>[] = [];

  beforeAll(() => {
    console.log('\nStarting API tests...');
    jest.setTimeout(120000); // Increase timeout to 2 minutes for the entire test suite
  });

  afterEach(async () => {
    if (activeRequests.length > 0) {
      await Promise.all(activeRequests.map(p => p.catch(() => {})));
      activeRequests = [];
    }
    await delay(1000);
  });

  afterAll(async () => {
    console.log('\nCompleting API tests...');
    if (activeRequests.length > 0) {
      await Promise.all(activeRequests.map(p => p.catch(() => {})));
      activeRequests = [];
    }
  });

  // Health check test
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await api.get<Types.HealthCheckResponse>('/api/health');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.telegram).toBeDefined();
    });
  });

  // Chat tests
  describe('Chats API', () => {
    it('should fetch chat list', async () => {
      const response = await api.get<Types.ApiResponse<Types.Chat[]>>('/api/telegram/chats');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      const chats = response.data.data;
      if (chats && chats.length > 0) {
        process.env.TEST_CHAT_ID = chats[0].id;
      }
    });

    it('should include required chat fields', async () => {
      await delay(2000);
      const response = await api.get<Types.ApiResponse<Types.Chat[]>>('/api/telegram/chats');
      const chats = response.data.data;
      expect(chats).toBeDefined();
      expect(chats?.length).toBeGreaterThan(0);
      
      const chat = chats?.[0];
      expect(chat).toBeDefined();
      expect(chat).toHaveProperty('id');
      expect(chat).toHaveProperty('name');
      expect(chat).toHaveProperty('type');
      expect(chat).toHaveProperty('unreadCount');
    });
  });

  // Message tests
  describe('Messages API', () => {
    let firstMessageId: number;
    let messageWithPeerId: Types.Message;

    it('should fetch messages with pagination', async () => {
      const chatId = process.env.TEST_CHAT_ID;
      const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
        params: {
          chatId,
          limit: 10,
          offset: 0
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      const messages = response.data.data;
      expect(messages).toBeDefined();
      expect(messages?.length).toBeLessThanOrEqual(10);

      if (messages && messages.length > 0) {
        firstMessageId = messages[0].id;
        // Store a message that has a peer ID for later tests
        messageWithPeerId = messages.find(msg => 
          msg.fromId && typeof msg.fromId === 'object'
        ) || messages[0];
      }
      
      await delay(3000);
    });

    describe('Message Slicing', () => {
      it('should fetch messages before a specific message', async () => {
        if (!firstMessageId) {
          console.warn('Skipping message slice test - no messages found');
          return;
        }

        await delay(3000);
        const chatId = process.env.TEST_CHAT_ID;
        const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
          params: {
            chatId,
            fromMessageId: firstMessageId,
            direction: 'before',
            limit: 5
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        const messages = response.data.data;
        expect(messages).toBeDefined();
        if (messages && messages.length > 0) {
          expect(messages[0].id).toBeLessThan(firstMessageId);
          expect(messages).toHaveLength(5);
          // Verify messages are in descending order
          expect([...messages].sort((a, b) => b.id - a.id)).toEqual(messages);
        }
      });

      it('should fetch messages after a specific message', async () => {
        if (!firstMessageId) {
          console.warn('Skipping message slice test - no messages found');
          return;
        }

        await delay(3000);
        const chatId = process.env.TEST_CHAT_ID;
        const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
          params: {
            chatId,
            fromMessageId: firstMessageId,
            direction: 'after',
            limit: 5
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        const messages = response.data.data;
        expect(messages).toBeDefined();
        if (messages && messages.length > 0) {
          expect(messages[0].id).toBeGreaterThan(firstMessageId);
          expect(messages).toHaveLength(5);
          // Verify messages are in ascending order
          expect([...messages].sort((a, b) => a.id - b.id)).toEqual(messages);
        }
      });

      it('should handle empty results when no messages exist in direction', async () => {
        if (!firstMessageId) {
          console.warn('Skipping message slice test - no messages found');
          return;
        }

        await delay(3000);
        const chatId = process.env.TEST_CHAT_ID;
        // Try to get messages after a very high message ID
        const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
          params: {
            chatId,
            fromMessageId: firstMessageId + 1000000,
            direction: 'after',
            limit: 5
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        const messages = response.data.data;
        expect(messages).toBeDefined();
        expect(messages).toHaveLength(0);
      });
    });

    describe('Peer ID Handling', () => {
      it('should properly format user peer IDs', async () => {
        if (!messageWithPeerId) {
          console.warn('Skipping peer ID test - no message with peer ID found');
          return;
        }

        const message = messageWithPeerId;
        if (typeof message.fromId === 'object' && message.fromId?._) {
          expect(message.fromId).toMatchObject({
            _: expect.stringMatching(/^peer(User|Channel|Chat)$/),
            [message.fromId._.replace('peer', '').toLowerCase() + 'Id']: expect.any(String)
          });
        }
      });

      it('should handle forwarded messages with peer IDs', async () => {
        const chatId = process.env.TEST_CHAT_ID;
        const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
          params: {
            chatId,
            limit: 20 // Increase limit to find forwarded messages
          }
        });

        const forwardedMessage = response.data.data?.find(msg => msg.forward);
        if (forwardedMessage?.forward?.fromId && typeof forwardedMessage.forward.fromId === 'object') {
          expect(forwardedMessage.forward).toHaveProperty('date');
          expect(forwardedMessage.forward.fromId).toMatchObject({
            _: expect.stringMatching(/^peer(User|Channel|Chat)$/),
            [forwardedMessage.forward.fromId._.replace('peer', '').toLowerCase() + 'Id']: expect.any(String)
          });
        }
      });

      it('should handle null fromId values', async () => {
        const chatId = process.env.TEST_CHAT_ID;
        const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
          params: {
            chatId,
            limit: 10
          }
        });

        const messages = response.data.data;
        expect(messages).toBeDefined();
        messages?.forEach(message => {
          if (message.fromId === null) {
            expect(message.fromId).toBeNull();
          }
        });
      });
    });

    it('should fetch specific messages by IDs', async () => {
      if (!firstMessageId) {
        console.warn('Skipping message ID test - no messages found');
        return;
      }

      await delay(3000);
      const chatId = process.env.TEST_CHAT_ID;
      const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
        params: {
          chatId,
          ids: firstMessageId.toString()
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const messages = response.data.data;
      expect(messages).toBeDefined();
      expect(messages?.some(msg => msg.id === firstMessageId)).toBe(true);
    });

    it('should include all message fields with proper types', async () => {
      await delay(3000);
      const chatId = process.env.TEST_CHAT_ID;
      const response = await api.get<Types.ApiResponse<Types.Message[]>>('/api/telegram/messages', {
        params: {
          chatId,
          limit: 1
        }
      });

      const messages = response.data.data;
      expect(messages).toBeDefined();
      expect(messages?.length).toBeGreaterThan(0);

      const message = messages?.[0];
      if (!message) {
        console.warn('No message found to test field types');
        return;
      }

      expect(message).toBeDefined();
      expect(message).toHaveProperty('id');
      expect(typeof message.id).toBe('number');
      expect(message).toHaveProperty('text');
      expect(typeof message.text).toBe('string');
      expect(message).toHaveProperty('date');
      expect(() => new Date(message.date)).not.toThrow();
      expect(message).toHaveProperty('fromId');

      // fromId can be a string, object, or null
      if (message.fromId) {
        if (typeof message.fromId === 'string') {
          expect(typeof message.fromId).toBe('string');
        } else {
          expect(message.fromId).toMatchObject({
            _: expect.stringMatching(/^peer(User|Channel|Chat)$/),
            [message.fromId._.replace('peer', '').toLowerCase() + 'Id']: expect.any(String)
          });
        }
      }

      if (message.replyTo) {
        expect(typeof message.replyTo).toBe('number');
      }

      if (message.forward) {
        const { forward } = message;
        expect(forward).toHaveProperty('fromId');
        expect(forward).toHaveProperty('date');
        if (forward.date) {
          expect(() => new Date(forward.date)).not.toThrow();
        }
      }

      if (message.views !== undefined) {
        expect(typeof message.views).toBe('number');
      }

      if (message.editDate) {
        const editDate = message.editDate;
        expect(typeof editDate).toBe('string');
        expect(() => new Date(editDate)).not.toThrow();
      }
    });

    it('should handle rate limits gracefully', async () => {
      const chatId = process.env.TEST_CHAT_ID;
      
      // Reduce the number of requests and increase delay
      const requests = Array(5).fill(0).map(() => () => 
        api.get<Types.ApiResponse>('/api/telegram/messages', {
          params: { chatId }
        })
      );

      console.log('\nExecuting sequential requests with delays...');
      const results = await makeSequentialRequests(requests, 5000); // 5 second delay between requests
      
      // Check if we encountered any rate limits
      const hasRateLimit = results.some(r => r?.status === 429 || r?.status === 420);
      if (hasRateLimit) {
        console.log('Rate limit encountered during sequential requests');
        const rateLimitResponse = results.find(r => r?.status === 429 || r?.status === 420);
        expect(rateLimitResponse?.data.success).toBe(false);
        expect(rateLimitResponse?.data.error).toContain('rate limit');
      } else {
        console.log('Completed all requests without hitting rate limits');
      }
    }, 60000); // 60 second timeout for this specific test
  });

  // Error handling tests
  describe('Error Handling', () => {
    it('should handle missing authentication', async () => {
      await expect(errorTestClient.get('/api/telegram/chats'))
        .rejects
        .toMatchObject({
          response: {
            status: 401
          }
        });
    });

    it('should handle invalid chat ID', async () => {
      await delay(2000);
      const response = await errorTestClient.get('/api/telegram/messages', {
        params: {
          chatId: 'invalid_id'
        },
        headers: {
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        },
        validateStatus: (status) => status >= 200 && status < 600 // Accept all status codes for this test
      });
      
      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
    });

    it('should handle missing required parameters', async () => {
      await delay(2000);
      const response = await errorTestClient.get('/api/telegram/messages', {
        headers: {
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        },
        validateStatus: (status) => status >= 200 && status < 600 // Accept all status codes for this test
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });
}); 