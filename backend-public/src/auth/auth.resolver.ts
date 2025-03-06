// src/auth/auth.resolver.ts
import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.dto/auth-payload.dto';
import { PrivyAuthGuard } from './privy-auth/privy-auth.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  @UseGuards(PrivyAuthGuard)
  async privyLogin(@Context() context: any): Promise<AuthPayload> {
    const claims = context.req?.user?.claims;
    const token = context.req?.user?.token;
    console.log('claims', context.req.user);
    const { createdUser } =
      await this.authService.handlePrivyLogin(claims.userId, token);
    return { createdUser };
  }

  /**
   * Query: whoAmI (optional)
   * - Protected by PrivyAuthGuard
   * - Example query to retrieve your identity/claims from the request
   */
  @Query(() => String)
  @UseGuards(PrivyAuthGuard)
  whoAmI(@Context() context: any): string {
    // The guard attaches { token, claims } to request.user
    // so we can read `context.req.user` or `context.req.user.claims`
    const claims = context.req?.user?.claims;
    if (claims) {
      // "userId" depends on how your token claims are structured
      return `You are user: ${claims.userId || claims.sub}`;
    }
    return 'No user claims found.';
  }
}
