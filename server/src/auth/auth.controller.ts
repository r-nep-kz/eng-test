import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthRequest, AuthResponse } from '@roundsquares/contract';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async login(@Body() body: AuthRequest): Promise<AuthResponse> {
    if (!body.username || !body.password) {
      throw new UnauthorizedException('Username and password are required');
    }

    const user = await this.authService.validateOrCreate(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.generateToken(user);
  }
}
