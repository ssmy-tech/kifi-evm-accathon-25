import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrivyClient } from '@privy-io/server-auth';

@Injectable()
export class PrivyAuthGuard implements CanActivate {
  constructor(@Inject('PRIVY_CLIENT') private readonly privyClient: PrivyClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Convert Nest's ExecutionContext to GqlExecutionContext
    const ctx = GqlExecutionContext.create(context);
    // 2. Extract the request from GQL context (because `req` was attached in context)
    const request = ctx.getContext().req;

    if (!request) {
      throw new UnauthorizedException('No request found in GraphQL context');
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    try {
      // Verify with Privy
      const verifiedClaims = await this.privyClient.verifyAuthToken(token);
      console.log('Verified claims:', verifiedClaims);
      // Attach claims to request
      request.user = {
        token,
        claims: verifiedClaims,
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid Privy token');
    }
  }
}
