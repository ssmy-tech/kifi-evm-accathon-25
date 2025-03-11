import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DataStatus, Prisma, User } from '@prisma/client';
import * as crypto from 'crypto';
import { UpdateUserSettingsInput } from './dto/user-settings.types';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByPrivyUserIdFull(privyId: string) {
    return this.prisma.user.findUnique({
      where: { privyId },
      include: {
        chats: {
          include: {
            calls: {
              include: {
                summary: true
              }
            },
            messages: true
          }
        }
      }
    });
  }

  async create(data: { privyId: string }) {
    const tgApiSecret = crypto.randomBytes(32).toString('hex');
    return this.prisma.user.create({
      data: {
        ...data,
        tgApiSecret,
        dataStatus: DataStatus.Private,
      }
    });
  }

  async updateTelegramApi(privyId: string, tgApiLink: string) {
    return this.prisma.user.update({
      where: { privyId },
      data: { tgApiLink }
    });
  }

  async getUserSettings(privyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { privyId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      enableAutoAlpha: user.enableAutoAlpha,
      selectedChatsIds: user.selectedChatsIds,
      groupCallThreshold: user.groupCallThreshold,
      slippage: user.slippage,
      buyAmount: user.buyAmount,
    };
  }

  async updateUserSettings(privyId: string, input: UpdateUserSettingsInput) {
    const updateData: Prisma.UserUpdateInput = {
      ...(input.enableAutoAlpha !== undefined && { enableAutoAlpha: input.enableAutoAlpha }),
      ...(input.selectedChatsIds !== undefined && { selectedChatsIds: input.selectedChatsIds }),
      ...(input.groupCallThreshold !== undefined && { groupCallThreshold: input.groupCallThreshold }),
      ...(input.slippage !== undefined && { slippage: input.slippage }),
      ...(input.buyAmount !== undefined && { buyAmount: input.buyAmount }),
    };

    const updatedUser = await this.prisma.user.update({
      where: { privyId },
      data: updateData,
    });

    return {
      enableAutoAlpha: updatedUser.enableAutoAlpha,
      selectedChatsIds: updatedUser.selectedChatsIds,
      groupCallThreshold: updatedUser.groupCallThreshold,
      slippage: updatedUser.slippage,
      buyAmount: updatedUser.buyAmount,
    };
  }

  // async syncWallets(userId: number, wallets: Array<{ address: string; chain: string }>) {
  //   let newlyCreatedCount = 0;

  //   for (const wallet of wallets) {
  //     const existingChat = await this.prisma.chats.findFirst({
  //       where: {
  //         users: {
  //           some: {
  //             id: userId
  //           }
  //         },
  //         calls: {
  //           some: {
  //             address: wallet.address.toLowerCase(),
  //             chain: wallet.chain as Chain
  //           }
  //         }
  //       }
  //     });

  //     if (!existingChat) {
  //       await this.prisma.chats.create({
  //         data: {
  //           tgChatId: `privy-${wallet.address.toLowerCase()}`,
  //           users: {
  //             connect: {
  //               id: userId
  //             }
  //           },
  //           calls: {
  //             create: {
  //               telegramCallId: `privy-${wallet.address.toLowerCase()}`,
  //               address: wallet.address.toLowerCase(),
  //               chain: wallet.chain as Chain
  //             }
  //           }
  //         }
  //       });
  //       newlyCreatedCount++;
  //     }
  //   }

  //   return newlyCreatedCount;
  // }
} 