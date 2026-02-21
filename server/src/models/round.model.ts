import { Table, Column, Model, DataType, HasMany, CreatedAt } from 'sequelize-typescript';
import { Score } from './score.model';

interface RoundCreationAttributes {
  uuid: string;
  start_datetime: Date;
  end_datetime: Date;
}

@Table({
  tableName: 'rounds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class Round extends Model<Round, RoundCreationAttributes> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  uuid!: string;

  @CreatedAt
  @Column({ field: 'created_at' })
  created_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  start_datetime!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  end_datetime!: Date;

  @HasMany(() => Score)
  scores!: Score[];
}
