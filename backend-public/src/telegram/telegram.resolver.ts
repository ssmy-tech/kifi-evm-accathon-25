import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrivyAuthGuard } from '../auth/privy-auth/privy-auth.guard';
import { ApiSecretResponse, ApiHealthResponse, ChatsResponse, SaveChatsInput } from './dto/telegram.types';

@Resolver()
export class TelegramResolver {
  constructor(private readonly telegramService: TelegramService) {}

  @Mutation(() => Boolean)
  @UseGuards(PrivyAuthGuard)
  async updateTelegramApiLink(
    @Context() context: any,
    @Args('apiLink') apiLink: string,
  ): Promise<boolean> {
    const privyId = context.req?.user?.claims?.userId;
    
    return await this.telegramService.updateApiLink(privyId, apiLink);;
  }

  @Query(() => ApiSecretResponse)
  @UseGuards(PrivyAuthGuard)
  async getTelegramApiSecret(@Context() context: any) {
    const privyId = context.req?.user?.claims?.userId;
    return this.telegramService.getApiSecret(privyId);
  }

  @Query(() => ApiHealthResponse)
  @UseGuards(PrivyAuthGuard)
  async checkTelegramApiHealth(@Context() context: any) {
    const privyId = context.req?.user?.claims?.userId;
    return this.telegramService.checkApiHealth(privyId);
  }

  @Query(() => String, { nullable: true })
  @UseGuards(PrivyAuthGuard)
  async getChatPhoto(
    @Context() context: any,
    @Args('chatId') chatId: string,
  ) {
    const privyId = context.req?.user?.claims?.userId;
    return this.telegramService.getChatPhoto(privyId, chatId);
  }

  @Query(() => ChatsResponse)
  @UseGuards(PrivyAuthGuard)
  async getTelegramChats(@Context() context: any) {
    const privyId = context.req?.user?.claims?.userId;
    return this.telegramService.getChats(privyId);
  }

  @Mutation(() => ChatsResponse)
  @UseGuards(PrivyAuthGuard)
  async saveUserChats(
    @Context() context: any,
    @Args('input') input: SaveChatsInput
  ) {
    const privyId = context.req?.user?.claims?.userId;
    await this.telegramService.createUserSavedChats(privyId, input);
    return this.telegramService.getUserSavedChats(privyId);
  }

  @Query(() => ChatsResponse)
  @UseGuards(PrivyAuthGuard)
  async getUserSavedChats(@Context() context: any) {
    const privyId = context.req?.user?.claims?.userId;
    return this.telegramService.getUserSavedChats(privyId);
  }
} 