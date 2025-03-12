import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Chain, DataStatus } from '@prisma/client';
import { TokenCallsResponse, TokenCalls, ChatWithCalls, Call, Message } from './dto/calls.types';

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCallsByToken(privyId: string, chain?: Chain, address?: string): Promise<TokenCallsResponse> {
    try {
      // Get user to verify they exist
      const user = await this.prisma.user.findUnique({
        where: { privyId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // First, get the user's chats
      const userChats = await this.prisma.chats.findMany({
        where: {
          users: {
            some: {
              privyId,
            },
          },
        },
        select: {
          tgChatId: true,
        },
      });

      const chatIds = userChats.map(chat => chat.tgChatId);

      // Build the where clause based on optional filters
      const whereClause: any = {
        chat: {
          tgChatId: {
            in: chatIds,
          },
        },
      };

      if (chain) {
        whereClause.chain = chain;
      }

      if (address) {
        whereClause.address = address;
      }

      // Get all calls that match the criteria
      const calls = await this.prisma.calls.findMany({
        where: whereClause,
        include: {
          chat: {
            include: {
              calls: {
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          },
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Group calls by token address and chain
      const groupedCalls = calls.reduce((acc, call) => {
        const key = `${call.chain}_${call.address}`;
        
        if (!acc[key]) {
          acc[key] = {
            chain: call.chain,
            address: call.address,
            chats: [],
          };
        }

        // Find if we already have this chat in the chats array
        let chatGroup = acc[key].chats.find(c => c.chat.id === call.chat.tgChatId);

        if (!chatGroup) {
          // Create new chat group if it doesn't exist
          chatGroup = {
            chat: {
              id: call.chat.tgChatId,
              name: call.chat.tgChatName || '',
              type: call.chat.tgChatType,
              photoUrl: call.chat.tgChatImageUrl || undefined,
              callCount: call.chat.calls.length,
              lastCallTimestamp: call.chat.calls[0]?.createdAt || undefined
            },
            calls: []
          };
          acc[key].chats.push(chatGroup);
        }

        // Map messages to the expected format
        const messages: Message[] = call.messages.map(msg => ({
          id: msg.telegramMessageId,
          createdAt: msg.createdAt,
          text: msg.text || undefined,
          fromId: msg.fromId ? JSON.stringify(msg.fromId) : undefined,
          messageType: msg.messageType,
          reason: msg.reason || undefined,
          tgMessageId: msg.tgMessageId
        }));

        // Add this call to the chat's calls array
        chatGroup.calls.push({
          id: call.telegramCallId,
          createdAt: call.createdAt,
          address: call.address,
          messages: messages,
          hasInitialAnalysis: call.hasInitialAnalysis,
          hasFutureAnalysis: call.hasFutureAnalysis
        });

        return acc;
      }, {} as Record<string, TokenCalls>);

      // Convert the grouped calls object to an array
      const tokenCalls = Object.values(groupedCalls);

      return { tokenCalls };
    } catch (error) {
      console.error('Error getting calls by token:', error);
      throw new Error(`Failed to get calls by token: ${error.message}`);
    }
  }

  async getPublicCalls(chain?: Chain, address?: string): Promise<TokenCallsResponse> {
    try {
      // Get all public users
      const publicUsers = await this.prisma.user.findMany({
        where: {
          dataStatus: DataStatus.Public
        },
        select: {
          privyId: true
        }
      });

      // Get all chats associated with public users
      const publicChats = await this.prisma.chats.findMany({
        where: {
          users: {
            some: {
              privyId: {
                in: publicUsers.map(user => user.privyId)
              }
            }
          }
        },
        select: {
          tgChatId: true
        }
      });

      const chatIds = publicChats.map(chat => chat.tgChatId);

      // Build the where clause based on optional filters
      const whereClause: any = {
        chat: {
          tgChatId: {
            in: chatIds
          }
        }
      };

      if (chain) {
        whereClause.chain = chain;
      }

      if (address) {
        whereClause.address = address;
      }

      // Get all calls that match the criteria
      const calls = await this.prisma.calls.findMany({
        where: whereClause,
        include: {
          chat: {
            include: {
              calls: {
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          },
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Group calls by token address and chain
      const groupedCalls = calls.reduce((acc, call) => {
        const key = `${call.chain}_${call.address}`;
        
        if (!acc[key]) {
          acc[key] = {
            chain: call.chain,
            address: call.address,
            chats: []
          };
        }

        // Find if we already have this chat in the chats array
        let chatGroup = acc[key].chats.find(c => c.chat.id === call.chat.tgChatId);

        if (!chatGroup) {
          // Create new chat group if it doesn't exist
          chatGroup = {
            chat: {
              id: call.chat.tgChatId,
              name: call.chat.tgChatName || '',
              type: call.chat.tgChatType,
              photoUrl: call.chat.tgChatImageUrl || undefined,
              callCount: call.chat.calls.length,
              lastCallTimestamp: call.chat.calls[0]?.createdAt || undefined
            },
            calls: []
          };
          acc[key].chats.push(chatGroup);
        }

        // Map messages to the expected format
        const messages: Message[] = call.messages.map(msg => ({
          id: msg.telegramMessageId,
          createdAt: msg.createdAt,
          text: msg.text || undefined,
          fromId: msg.fromId ? JSON.stringify(msg.fromId) : undefined,
          messageType: msg.messageType,
          reason: msg.reason || undefined,
          tgMessageId: msg.tgMessageId
        }));

        // Add this call to the chat's calls array
        chatGroup.calls.push({
          id: call.telegramCallId,
          createdAt: call.createdAt,
          address: call.address,
          messages: messages,
          hasInitialAnalysis: call.hasInitialAnalysis,
          hasFutureAnalysis: call.hasFutureAnalysis
        });

        return acc;
      }, {} as Record<string, TokenCalls>);

      // Convert the grouped calls object to an array
      const tokenCalls = Object.values(groupedCalls);

      return { tokenCalls };
    } catch (error) {
      console.error('Error getting public calls:', error);
      throw new Error(`Failed to get public calls: ${error.message}`);
    }
  }
} 