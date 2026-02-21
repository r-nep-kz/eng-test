import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Score } from './score.model';
import type { UserRole } from '@roundsquares/contract';

interface UserCreationAttributes {
  login: string;
  password_hash: string;
  role: UserRole;
}

@Table({
  tableName: 'users',
  timestamps: false,
})
export class User extends Model<User, UserCreationAttributes> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  })
  login!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password_hash!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  role!: UserRole;

  @HasMany(() => Score)
  scores!: Score[];
}
