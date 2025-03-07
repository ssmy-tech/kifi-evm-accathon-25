import { Inject, Injectable } from '@nestjs/common';
import { PrivyClient } from '@privy-io/server-auth';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRIVY_CLIENT') private readonly privyClient: PrivyClient,
    private readonly usersService: UsersService,
  ) {}

  async handlePrivyLogin(
    privyUserId: string,
    token: string,
  ): Promise<{ createdUser: boolean }> {
    let userExists = true;
    
    // Find or create user
    let user = await this.usersService.findByPrivyUserIdFull(privyUserId);

    if (!user) {
      userExists = false;
      user = await this.usersService.create({ privyId: privyUserId }) as any;
    }

    return { createdUser: !userExists };
  }
}
