import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { User } from './user.model';
import { PrismaService } from '../prisma.service';
import { UseGuards } from '@nestjs/common';
import { PrivyAuthGuard } from '../auth/privy-auth/privy-auth.guard';

@Resolver(() => User)
export class UsersResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [User])
  async users() {
    return this.prisma.user.findMany();
  }

  @Query(() => User, { nullable: true })
  @UseGuards(PrivyAuthGuard)
  async user(@Context() context) {
    const privyId = context.req?.user?.claims?.userId;
    return this.prisma.user.findUnique({
      where: { privyId }
    });
  }
} 