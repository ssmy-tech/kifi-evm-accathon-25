import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DataStatus } from '@prisma/client';
import * as crypto from 'crypto';

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