import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Calls, Messages } from '@prisma/client';
import axios from 'axios';
import { TelegramMessage, TelegramCall, AnalysisResult, AnalyzeContextRequest, AnalyzeContextResponse, MessageInfo, ContextCall } from './types';

type CallWithMessages = Calls & {
  messages: Messages[];
};

interface TokenData {
  price?: string;
  priceUsd?: string;
  volume?: {
    h24: string;
    h6: string;
    h1: string;
    m5: string;
  };
  priceChange?: {
    h24: string;
    h6: string;
    h1: string;
    m5: string;
  };
  liquidity?: {
    usd: string;
    base: string;
    quote: string;
  };
  txns24h?: {
    buys: number;
    sells: number;
  };
  pairs?: Array<{
    exchange: string;
    chainId: string;
    pairAddress: string;
    baseToken: {
      address: string;
      name: string;
      symbol: string;
    };
    quoteToken: {
      address: string;
      name: string;
      symbol: string;
    };
    priceUsd: string;
    liquidity: {
      usd: string;
      base: string;
      quote: string;
    };
    volume: {
      h24: string;
      h6: string;
      h1: string;
      m5: string;
    };
    priceChange: {
      h24: string;
      h6: string;
      h1: string;
      m5: string;
    };
    txns: {
      h24: {
        buys: number;
        sells: number;
      };
      h6: {
        buys: number;
        sells: number;
      };
      h1: {
        buys: number;
        sells: number;
      };
      m5: {
        buys: number;
        sells: number;
      };
    };
  }>;
}

@Injectable()
export class TelegramAnalyticsService {
  private readonly logger = new Logger(TelegramAnalyticsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Fetch current token data from DexScreener
   */
  private async fetchTokenData(contractAddress: string, chain: string): Promise<TokenData> {
    try {
      const chainMap = {
        'BASE': 'base',
        'ETHEREUM': 'ethereum',
        'SOLANA': 'solana',
        'MONAD': 'monad'
      };
      
      const chainId = chainMap[chain] || 'ethereum';
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`);
      
      if (!response.data?.pairs?.length) {
        return {};
      }

      // Get the most liquid pair
      const pair = response.data.pairs.sort((a, b) => 
        parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0')
      )[0];

      // Format pairs data
      const pairs = response.data.pairs.map(p => ({
        exchange: p.dexId,
        chainId: p.chainId,
        pairAddress: p.pairAddress,
        baseToken: {
          address: p.baseToken.address,
          name: p.baseToken.name,
          symbol: p.baseToken.symbol
        },
        quoteToken: {
          address: p.quoteToken.address,
          name: p.quoteToken.name,
          symbol: p.quoteToken.symbol
        },
        priceUsd: p.priceUsd,
        liquidity: p.liquidity,
        volume: p.volume,
        priceChange: p.priceChange,
        txns: p.txns
      }));

      return {
        price: pair.priceUsd,
        priceUsd: pair.priceUsd,
        volume: pair.volume,
        priceChange: pair.priceChange,
        liquidity: pair.liquidity,
        txns24h: pair.txns?.h24,
        pairs
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch token data from DexScreener: ${error.message}`);
      return {};
    }
  }

  /**
   * Fetch contract calls from the database using Prisma
   */
  private async fetchContractCalls(
    contractAddress: string,
    privyId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<TelegramCall[]> {
    this.logger.debug(`Fetching calls for contract: ${contractAddress}${privyId ? ` and privyId: ${privyId}` : ''}`);
    
    try {
      const dateFilter = {};
      if (startDate) dateFilter['gte'] = new Date(startDate);
      if (endDate) dateFilter['lte'] = new Date(endDate);

      if (privyId) {
        // Get calls only for the specified user's chats
        const user = await this.prisma.user.findUnique({
          where: { privyId },
          include: {
            chats: {
              include: {
                calls: {
                  where: {
                    address: { equals: contractAddress, mode: 'insensitive' as const },
                    ...(startDate || endDate ? { createdAt: dateFilter } : {}),
                  },
                  include: {
                    messages: true,
                  },
                  orderBy: { createdAt: 'desc' as const },
                },
              },
            },
          },
        });

        if (!user) {
          throw new HttpException(`User not found with privyId: ${privyId}`, HttpStatus.NOT_FOUND);
        }

        // Flatten the calls from all chats
        const contractCalls = user.chats.flatMap(chat => chat.calls) as CallWithMessages[];
        return this.formatCalls(contractCalls);
      } else {
        // Get all calls for the contract address
        const contractCalls = await this.prisma.calls.findMany({
          where: {
            address: { equals: contractAddress, mode: 'insensitive' as const },
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          include: {
            messages: true,
          },
          orderBy: { createdAt: 'desc' as const },
        }) as CallWithMessages[];

        return this.formatCalls(contractCalls);
      }
    } catch (error) {
      this.logger.error(`Error fetching contract calls from Prisma: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new Error(`Failed to fetch contract calls: ${error.message}`);
    }
  }

  /**
   * Format calls into the expected response format
   */
  private formatCalls(calls: CallWithMessages[]): TelegramCall[] {
    return calls.map(call => ({
      id: call.telegramCallId,
      timestamp: call.createdAt.toISOString(),
      messages: call.messages.map(msg => ({
        id: msg.telegramMessageId,
        text: msg.text || '',
        timestamp: msg.createdAt.toISOString(),
        sender: this.extractSenderFromJson(msg.fromId),
        chatId: msg.tgChatId,
      })),
    }));
  }

  /**
   * Extract sender information from the fromId JSON field
   */
  private extractSenderFromJson(fromId: any): string {
    if (!fromId) return 'Unknown';
    
    try {
      const fromIdObj = typeof fromId === 'string' ? JSON.parse(fromId) : fromId;
      if (fromIdObj.username) return `@${fromIdObj.username}`;
      if (fromIdObj.first_name) return fromIdObj.first_name + (fromIdObj.last_name ? ` ${fromIdObj.last_name}` : '');
      if (fromIdObj.id) return `User ${fromIdObj.id}`;
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Extract all messages from the calls
   */
  private extractMessagesFromCalls(calls: TelegramCall[]): TelegramMessage[] {
    return calls.reduce((all, call) => [...all, ...call.messages], [] as TelegramMessage[]);
  }

  /**
   * Analyze messages using SecretLLM from Nillion
   */
  private async analyzeMessagesWithLLM(messages: TelegramMessage[], contractAddress: string): Promise<AnalysisResult> {
    const nilaiApiUrl = this.configService.get<string>('NILAI_API_URL');
    const nilaiApiKey = this.configService.get<string>('NILAI_API_KEY');
    
    if (!nilaiApiUrl || !nilaiApiKey) throw new Error('Missing Nilai API configuration');
    
    try {
      // Get token metadata from the most recent call
      const latestCall = await this.prisma.calls.findFirst({
        where: { address: { equals: contractAddress, mode: 'insensitive' as const } },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch token data from DexScreener
      const tokenData = await this.fetchTokenData(contractAddress, latestCall?.chain || 'ETHEREUM');
      console.log(tokenData);

      const tokenContext = latestCall?.ticker ? 
        `Token Information:
        Name: ${latestCall.tokenName || 'Unknown'}
        Symbol: ${latestCall.ticker}
        Chain: ${latestCall.chain}
        Price: ${tokenData.price ? `$${tokenData.price}` : 'Unknown'}
        24h Volume: ${tokenData.volume?.h24 ? `$${tokenData.volume.h24}` : 'Unknown'}
        24h Price Change: ${tokenData.priceChange?.h24 ? `${tokenData.priceChange.h24}%` : 'Unknown'}
        Available on: ${tokenData.pairs?.map(p => p.exchange).join(', ') || 'Unknown'}` : '';

      const formattedMessages = messages
        .map(msg => {
          const msgTime = new Date(msg.timestamp);
          return `[${msgTime.toLocaleString()} (${msgTime.toTimeString().split(' ')[0]})] ${msg.sender}: ${msg.text}`;
        })
        .join('\n');
      
      const currentTime = new Date().toISOString();
      const currentTimeFormatted = new Date(currentTime).toLocaleString();
      const messageTimeRange = messages.length > 0 ? {
        earliest: new Date(Math.min(...messages.map(m => new Date(m.timestamp).getTime()))).toISOString(),
        latest: new Date(Math.max(...messages.map(m => new Date(m.timestamp).getTime()))).toISOString()
      } : null;

      const marketContext = `Current market data (as of ${currentTimeFormatted}):${
        tokenData.price ? ` Price $${tokenData.price},` : ''
      }${
        tokenData.priceChange?.h24 ? ` 24h change ${tokenData.priceChange.h24}%` : ''
      }`;

      // Get a clear summary
      const summaryResponse = await axios.post(
        `${nilaiApiUrl}/v1/chat/completions`,
        {
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          messages: [
            {
              role: 'system',
              content: `You are a direct and clear analyst of blockchain discussions across Telegram channels.
              Write concise, factual summaries in 1-2 sentences.
              These are aggregated messages from multiple Telegram channels, not a single conversation.
              Consider how recent or outdated the Telegram discussions are relative to current market data.
              Note significant changes between discussed metrics and current data.
              Focus on timing gaps and data differences, not investment advice.
              Never use phrases like "the conversation is about" or "appears to be".
              Never use bullet points or special formatting.
              
              ${tokenContext}`
            },
            {
              role: 'user',
              content: `Provide a 1-2 sentence summary that includes:
              1. Key points and numbers mentioned across Telegram channels
              2. How current market data compares to the discussed metrics
              3. Note if messages are recent (last hour), today, or older
              
              Time context:
              - Messages from: ${messageTimeRange ? new Date(messageTimeRange.earliest).toLocaleString() : 'Unknown'}
              - Latest message: ${messageTimeRange ? new Date(messageTimeRange.latest).toLocaleString() : 'Unknown'}
              - Current time: ${currentTimeFormatted}
              
              ${marketContext}
              
              Aggregated Telegram messages:
              ${formattedMessages}`
            }
          ],
          temperature: 0.1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nilaiApiKey}`,
          },
        }
      );
      
      const summary = summaryResponse.data.choices[0].message.content.trim();

      return {
        summary,
        sentiment: {
          overall: 'Neutral',
          communityMood: 'neutral',
          details: []
        },
        keyTopics: [{
          topic: 'No clear topics identified',
          frequency: 0,
          context: 'Insufficient messages for topic analysis'
        }],
        nextSteps: [{
          suggestion: 'Monitor for more activity',
          context: 'Insufficient data for detailed suggestions'
        }]
      };
    } catch (error) {
      this.logger.error(`LLM analysis error: ${error.message}`, error.stack);
      throw new Error(`Failed to analyze messages: ${error.message}`);
    }
  }

  /**
   * Analyze Telegram messages for a specific contract
   */
  async analyzeContractMessages(
    contractAddress: string,
    privyId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AnalysisResult> {
    this.logger.log(`Analyzing messages for contract: ${contractAddress} and privyId: ${privyId}`);
    
    try {
      const calls = await this.fetchContractCalls(contractAddress, privyId, startDate, endDate);
      if (!calls?.length) throw new HttpException('No calls found for this contract', HttpStatus.NOT_FOUND);
      
      const allMessages = this.extractMessagesFromCalls(calls);
      if (!allMessages.length) throw new HttpException('No messages found for this contract', HttpStatus.NOT_FOUND);
      
      return await this.analyzeMessagesWithLLM(allMessages, contractAddress);
    } catch (error) {
      this.logger.error(`Error analyzing contract messages: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to analyze contract messages',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Analyze context of a call
   */
  async analyzeContext(contextCall: ContextCall): Promise<AnalyzeContextResponse> {
    this.logger.debug(`Analyzing context for call: ${contextCall.callId}`);

    try {
      // Validate request
      if (!contextCall || !contextCall.messages) {
        throw new HttpException('Call context and messages are required', HttpStatus.BAD_REQUEST);
      }

      if (!contextCall.callMessage) {
        throw new HttpException('Call message is required for both initial and future contexts', HttpStatus.BAD_REQUEST);
      }

      const { token, callMessage, messages } = contextCall;
      const callMessageId = callMessage.id;

      // Create a set of valid message IDs for quick lookup
      const validMessageIds = new Set(messages.map(m => m.id));

      const nilaiApiUrl2 = this.configService.get<string>('NILAI_API_URL_2');
      const nilaiApiKey2 = this.configService.get<string>('NILAI_API_KEY_2');
      const nillaiApiModel2 = this.configService.get<string>('NILAI_API_MODEL_2');
      
      if (!nilaiApiUrl2 || !nilaiApiKey2) {
        throw new Error('Missing Nilai API configuration');
      }

      // Format messages for analysis with clear message IDs
      const formatMessagesForContext = (messages: MessageInfo[]) => 
        messages.map(msg => {
          const msgTime = new Date(msg.date);
          const sender = msg.fromId ? `User ${msg.fromId.userId}` : 'Channel';
          return `Message ID ${msg.id}: [${msgTime.toLocaleString()}] ${sender}: ${msg.text}`;
        }).join('\n');

      // Create context about the token
      const tokenContext = `Token Information:
        Name: ${token.name}
        Symbol: ${token.ticker}
        Address: ${token.address}
        Chain: ${token.chain}
        Call Message (ID ${callMessage.id}): ${callMessage.text}`;

      // Analyze messages for relevance
      const aiResponse = await axios.post(
        `${nilaiApiUrl2}/v1/chat/completions`,
        {
          model: nillaiApiModel2,
          messages: [
            {
              role: 'system',
              content: `You are analyzing Telegram messages to find discussions related to a specific cryptocurrency token.
              Your task is to identify messages that are part of the token discussion, including:
              
              DIRECT TOKEN MENTIONS:
              - Exact token address matches
              - Token name/symbol mentions (${token.name}, ${token.ticker})
              
              CONTEXTUAL MESSAGES that are part of the token discussion:
              - Questions about the token ("where is this token")
              - Responses about the token location ("there is the token")
              - Interest in the token ("I want this token")
              - Token-related actions ("give me your token")
              - Messages immediately before/after token address posts that reference "this token" or similar
              
              CRITICAL INSTRUCTIONS:
              1. Include both direct mentions AND contextual messages about THIS specific token
              2. Messages must be clearly about ${token.name} (${token.ticker}) - not other tokens
              3. Consider conversation flow - include related messages that form part of the token discussion
              4. Each returned message must have a clear connection to the token discussion
              5. Exclude generic or unrelated messages
              
              ${tokenContext}`
            },
            {
              role: 'user',
              content: `Analyze these messages and identify ALL messages that are part of the ${token.name} (${token.ticker}) discussion.
              Include both direct mentions and contextual messages that are clearly part of the same conversation.
              
              Format your response exactly like this:
              Message ID 123: Direct mention "exact token address ${token.address}"
              Message ID 456: Context "asking about this specific token's location"
              Message ID 789: Context "responding with token location"
              
              DO NOT include:
              - Messages about other tokens
              - Generic market discussion
              - Unrelated chat messages
              - Messages that could be about any token
              
              Messages to analyze:
              ${formatMessagesForContext(messages)}`
            }
          ],
          temperature: 0.1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nilaiApiKey2}`,
          },
        }
      );

      const analysis = aiResponse.data.choices[0].message.content;
      this.logger.debug('AI Analysis:', analysis);
      
      // Parse the AI response to extract message IDs and reasons
      const matches = messages
        .filter(msg => {
          // Exclude the call message
          if (msg.id === callMessageId) return false;
          
          // Check if the message is mentioned in the AI analysis
          return analysis.toLowerCase().includes(`message id ${msg.id}`) &&
                 !analysis.toLowerCase().includes(`message id ${msg.id}:.*not related`, 'i');
        })
        .map(msg => {
          // Extract the reason from the AI analysis
          const reasonMatch = analysis.match(new RegExp(`Message ID ${msg.id}:([^\\n]*)`, 'i'));
          const reason = reasonMatch ? reasonMatch[1].trim() : '';
          
          // Skip if no clear reason or if the message is just a single character
          if (!reason || msg.text.trim().length <= 1) return null;
          
          // Skip if the reason doesn't contain a quote of the actual token-related content
          if (!reason.includes('"')) return null;
          
          return {
            messageId: msg.id,
            reason: 'call_message_text' as const,
            matchedTerm: reason
          };
        })
        .filter((match): match is NonNullable<typeof match> => 
          match !== null && validMessageIds.has(match.messageId)
        ); // Final validation of message IDs

      // Format response
      const contextResponse: AnalyzeContextResponse = {
        relatedMessageIds: [...new Set(matches.map(m => m.messageId))],
        matchReason: matches
      };

      return contextResponse;
    } catch (error) {
      this.logger.error(`Error analyzing context: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to analyze context: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 