import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { Round } from '../models/round.model';
import { Score } from '../models/score.model';
import { User } from '../models/user.model';
import { v4 as uuidv4 } from 'uuid';
import {
  computeRoundStatus,
  computeScoreFromTaps,
  type RoundWithStatus,
  type BestPlayer,
  type UserRole,
} from '@roundsquares/contract';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Round) private readonly roundModel: typeof Round,
    @InjectModel(Score) private readonly scoreModel: typeof Score,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  /** Returns all non-finished rounds (active + cooldown) */
  async getActiveAndScheduledRounds(): Promise<RoundWithStatus[]> {
    const rounds = await this.roundModel.findAll({
      order: [['created_at', 'DESC']],
    });

    const now = new Date();
    return rounds
      .map((r) => this.toRoundWithStatus(r, now))
      .filter((r) => r.status !== 'finished');
  }

  /** Finds a round by UUID */
  async getRoundByUuid(uuid: string): Promise<Round | null> {
    return this.roundModel.findByPk(uuid);
  }

  /** Gets or creates a score record for a user in a round */
  async getOrCreateScore(userId: string, roundUuid: string): Promise<Score> {
    const [scoreRecord] = await this.scoreModel.findOrCreate({
      where: { user: userId, round: roundUuid },
      defaults: { user: userId, round: roundUuid, taps: 0 },
    });
    return scoreRecord;
  }

  /** Creates a new round with cooldown */
  async createRound(): Promise<RoundWithStatus> {
    const now = new Date();
    const cooldownMs = parseInt(process.env.COOLDOWN_DURATION || '30', 10) * 1000;
    const roundMs = parseInt(process.env.ROUND_DURATION || '60', 10) * 1000;

    const startDatetime = new Date(now.getTime() + cooldownMs);
    const endDatetime = new Date(now.getTime() + cooldownMs + roundMs);

    const round = await this.roundModel.create({
      uuid: uuidv4(),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
    });

    return this.toRoundWithStatus(round);
  }

  /**
   * Processes a goose tap.
   *
   * Guarantees:
   * - Round must be active (checked inside transaction)
   * - Nikita rule: tap accepted (200) but counter not incremented
   * - Race condition safety: SELECT FOR UPDATE on score row
   */
  async processTap(
    userId: string,
    roundUuid: string,
    role: UserRole,
  ): Promise<{ score: number }> {
    return this.sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
      async (transaction) => {
        // 1. Verify round exists and is active
        const round = await this.roundModel.findByPk(roundUuid, { transaction });
        if (!round) {
          throw new NotFoundException('Round not found');
        }

        const status = computeRoundStatus(round.start_datetime, round.end_datetime);
        if (status !== 'active') {
          throw new BadRequestException('Round is not active');
        }

        // 2. Get or create score record
        const [scoreRecord] = await this.scoreModel.findOrCreate({
          where: { user: userId, round: roundUuid },
          defaults: { user: userId, round: roundUuid, taps: 0 },
          transaction,
        });

        // 3. Lock row for atomic update (SELECT FOR UPDATE)
        const lockedScore = await this.scoreModel.findOne({
          where: { user: userId, round: roundUuid },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        if (!lockedScore) {
          throw new NotFoundException('Score record not found');
        }

        // 4. Nikita rule: tap accepted but counter not incremented
        if (role !== 'nikita') {
          lockedScore.taps += 1;
          await lockedScore.save({ transaction });
        }

        return { score: computeScoreFromTaps(lockedScore.taps) };
      },
    );
  }

  /** Finished round summary: total score and best player */
  async getRoundSummary(roundUuid: string): Promise<{
    totalScore: number;
    bestPlayer: BestPlayer | null;
  }> {
    const scores = await this.scoreModel.findAll({
      where: { round: roundUuid },
      include: [{ model: this.userModel, as: 'userRef', attributes: ['login'] }],
    });

    let totalScore = 0;
    let bestPlayer: BestPlayer | null = null;
    let maxScore = -1;

    for (const s of scores) {
      const points = computeScoreFromTaps(s.taps);
      totalScore += points;

      if (points > maxScore) {
        maxScore = points;
        bestPlayer = { username: s.userRef.login, score: points };
      }
    }

    return { totalScore, bestPlayer };
  }

  /** Converts DB Round model to RoundWithStatus */
  toRoundWithStatus(round: Round, now: Date = new Date()): RoundWithStatus {
    return {
      uuid: round.uuid,
      created_at: round.created_at.toISOString(),
      start_datetime: round.start_datetime.toISOString(),
      end_datetime: round.end_datetime.toISOString(),
      status: computeRoundStatus(round.start_datetime, round.end_datetime, now),
    };
  }
}
