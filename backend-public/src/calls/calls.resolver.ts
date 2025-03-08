import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { CallsService } from './calls.service';
import { TokenCallsResponse, GetCallsInput } from './dto/calls.types';
import { UseGuards } from '@nestjs/common';
import { PrivyAuthGuard } from '../auth/privy-auth/privy-auth.guard';

@Resolver()
export class CallsResolver {
  constructor(private readonly callsService: CallsService) {}

  @Query(() => TokenCallsResponse)
  @UseGuards(PrivyAuthGuard)
  async getCallsByToken(
    @Context() context: any,
    @Args('input', { nullable: true }) input?: GetCallsInput,
  ): Promise<TokenCallsResponse> {
    const privyId = context.req?.user?.claims?.userId;
    console.log('privyUserId', privyId);
    return this.callsService.getCallsByToken(
      privyId,
      input?.chain,
      input?.address,
    );
  }
} 