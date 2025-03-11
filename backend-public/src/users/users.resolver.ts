import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { User } from './user.model';
import { UsersService } from './users.service';
import { UseGuards } from '@nestjs/common';
import { PrivyAuthGuard } from '../auth/privy-auth/privy-auth.guard';
import { UserSettings, UpdateUserSettingsInput } from './dto/user-settings.types';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { nullable: true })
  @UseGuards(PrivyAuthGuard)
  async user(@Context() context) {
    const privyId = context.req?.user?.claims?.userId;
    return this.usersService.findByPrivyUserIdFull(privyId);
  }

  @Query(() => UserSettings)
  @UseGuards(PrivyAuthGuard)
  async getUserSettings(@Context() context) {
    const privyId = context.req?.user?.claims?.userId;
    return this.usersService.getUserSettings(privyId);
  }

  @Mutation(() => UserSettings)
  @UseGuards(PrivyAuthGuard)
  async updateUserSettings(
    @Context() context,
    @Args('input') input: UpdateUserSettingsInput
  ) {
    const privyId = context.req?.user?.claims?.userId;
    return this.usersService.updateUserSettings(privyId, input);
  }
} 