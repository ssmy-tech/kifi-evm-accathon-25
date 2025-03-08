import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { CallsService } from './calls.service';
import { TokenCallsResponse, GetCallsInput } from './dto/calls.types';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

@Resolver()
export class CallsResolver {
  constructor(private readonly callsService: CallsService) {}

  @Query(() => TokenCallsResponse)
  @UseGuards(AuthGuard)
  async getCallsByToken(
    @Context() context: any,
    @Args('input', { nullable: true }) input?: GetCallsInput,
  ): Promise<TokenCallsResponse> {
    const privyUserId = context.privyUserId;
    return this.callsService.getCallsByToken(
      privyUserId,
      input?.chain,
      input?.address,
    );
  }
} 