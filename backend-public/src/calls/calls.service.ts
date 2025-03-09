import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Chain } from '@prisma/client';
import { TokenCallsResponse, TokenCalls, CallWithChat, Message } from './dto/calls.types';

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
          chat: true,
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      // Group calls by token address and chain
      const groupedCalls = calls.reduce((acc, call) => {
        const key = `${call.chain}_${call.address}`;
        
        if (!acc[key]) {
          acc[key] = {
            chain: call.chain,
            address: call.address,
            calls: [],
          };
        }

        // Find if we already have this chat in the calls array
        const existingCallIndex = acc[key].calls.findIndex(
          (c) => c.chat.id === call.chat.tgChatId
        );

        // Map messages to the expected format
        const messages: Message[] = call.messages.map(msg => {
          // Create the message object with fromId as null by default
          return {
            id: msg.telegramMessageId,
            createdAt: msg.createdAt,
            text: msg.text || undefined,
            fromId: (msg as any).fromId || null
          };
        });

        if (existingCallIndex >= 0) {
          // Increment call count if chat already exists
          acc[key].calls[existingCallIndex].callCount += 1;
          
          // Add messages to existing call
          if (!acc[key].calls[existingCallIndex].messages) {
            acc[key].calls[existingCallIndex].messages = [];
          }
          
          // Add new messages that aren't already in the array
          const existingMessageIds = new Set(
            acc[key].calls[existingCallIndex].messages?.map(m => m.id) || []
          );
          
          messages.forEach(msg => {
            if (!existingMessageIds.has(msg.id)) {
              acc[key].calls[existingCallIndex].messages!.push(msg);
            }
          });
          
          // Sort messages by createdAt
          acc[key].calls[existingCallIndex].messages!.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          );
        } else {
          // Add new chat with call count 1
          acc[key].calls.push({
            chat: {
              id: call.chat.tgChatId,
              name: call.chat.tgChatName || '',
              type: call.chat.tgChatType,
              photoUrl: call.chat.tgChatImageUrl || undefined,
            },
            callCount: 1,
            messages,
          });
        }

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
} 