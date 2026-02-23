import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import type { UserRole, AuthResponse } from '@roundsquares/contract';

const SALT_ROUNDS = 10;

/** Username to role mapping */
const ROLE_MAP: Record<string, UserRole> = {
  admin: 'admin',
  'Никита': 'nikita',
};

export interface JwtPayload {
  username: string;
  sub: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates an existing user or creates a new one.
   * Returns null on invalid password.
   */
  async validateOrCreate(
    username: string,
    password: string,
  ): Promise<{ login: string; role: UserRole } | null> {
    const existingUser = await this.userModel.findOne({
      where: { login: username },
    });

    if (existingUser) {
      const isPasswordValid = await bcrypt.compare(password, existingUser.password_hash);
      if (!isPasswordValid) return null;

      return { login: existingUser.login, role: existingUser.role };
    }

    // New user — assign role based on username
    const role = ROLE_MAP[username] ?? 'user';
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await this.userModel.create({
      login: username,
      password_hash: passwordHash,
      role,
    });

    return { login: newUser.login, role: newUser.role };
  }

  /** Generates a JWT token for the user */
  generateToken(user: { login: string; role: UserRole }): AuthResponse {
    const payload: JwtPayload = {
      username: user.login,
      sub: user.login,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
