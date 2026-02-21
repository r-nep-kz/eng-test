import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../models/user.model';
import * as bcrypt from 'bcrypt';
import type { UserRole } from '@roundsquares/contract';

const SALT_ROUNDS = 10;

interface SeedUser {
  login: string;
  password: string;
  role: UserRole;
}

const SEED_USERS: SeedUser[] = [
  { login: 'roma', password: 'roma', role: 'user' },
  { login: 'admin', password: 'admin', role: 'admin' },
];

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async onModuleInit(): Promise<void> {
    await this.sequelize.authenticate();
    this.logger.log('Database connection established.');

    const tableExists = await this.checkTableExists('users');

    if (!tableExists) {
      this.logger.log('Tables not found. Initializing database...');
      await this.sequelize.sync({ force: true });
      await this.seedUsers();
      this.logger.log('Database initialized with seed data.');
    } else {
      this.logger.log('Database already initialized.');
    }
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const tables = await this.sequelize.getQueryInterface().showAllTables();
      return tables.includes(tableName);
    } catch {
      return false;
    }
  }

  private async seedUsers(): Promise<void> {
    for (const userData of SEED_USERS) {
      const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
      await User.create({
        login: userData.login,
        password_hash: passwordHash,
        role: userData.role,
      });
    }
  }
}
