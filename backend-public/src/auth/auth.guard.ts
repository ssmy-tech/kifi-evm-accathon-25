import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    // Check if privyUserId exists in the request
    if (!req.privyUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Add privyUserId to the GraphQL context
    ctx.getContext().privyUserId = req.privyUserId;

    return true;
  }
} 