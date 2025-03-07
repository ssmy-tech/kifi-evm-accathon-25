import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrivyAuthGuard } from './privy-auth/privy-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('privy-login')
  @UseGuards(PrivyAuthGuard)
  async handlePrivyLogin(
    @Request() req
  ) {
    // The PrivyAuthGuard has already validated the token.
    // We can grab the raw token from req.user, if needed:
    const { token, userId } = req.user;

    // Pass the verified token & userId to the AuthService.
    return this.authService.handlePrivyLogin(userId, token);
  }
}
