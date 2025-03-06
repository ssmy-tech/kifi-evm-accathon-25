import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { User } from './user.model';
import { PrismaService } from '../prisma.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [User])
  async users() {
    return this.prisma.user.findMany();
  }

  @Query(() => User, { nullable: true })
  async user(@Args('privyId') privyId: string) {
    return this.prisma.user.findUnique({
      where: { privyId },
    });
  }
} 