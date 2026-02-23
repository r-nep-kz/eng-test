import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Round } from './round.model';

interface ScoreCreationAttributes {
  user: string;
  round: string;
  taps?: number;
}

@Table({
  tableName: 'scores',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user', 'round'],
      name: 'unique_user_round',
    },
  ],
})
export class Score extends Model<Score, ScoreCreationAttributes> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  user!: string;

  @ForeignKey(() => Round)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  round!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  taps!: number;

  @BelongsTo(() => User)
  userRef!: User;

  @BelongsTo(() => Round)
  roundRef!: Round;
}
