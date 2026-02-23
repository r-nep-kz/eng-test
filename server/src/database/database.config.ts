import { SequelizeModuleOptions } from '@nestjs/sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

export const databaseConfig: SequelizeModuleOptions = {
  dialect: 'postgres',
  uri: process.env.DB_URI || 'postgresql://postgres:postgres@localhost:6543/postgres',
  autoLoadModels: true,
  synchronize: false,
  logging: false,
};
