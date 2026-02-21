import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamesService } from './games.service';
import type { JwtPayload } from '../auth/auth.service';
import {
  computeScoreFromTaps,
  type RoundsResponse,
  type RoundDetailResponse,
  type RoundFinishedResponse,
  type TapRequest,
  type TapResponse,
  type CreateRoundResponse,
} from '@roundsquares/contract';

interface AuthenticatedRequest {
  user: JwtPayload;
}

@Controller()
@UseGuards(AuthGuard('jwt'))
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('rounds')
  async getRounds(): Promise<RoundsResponse> {
    return this.gamesService.getActiveAndScheduledRounds();
  }

  @Get('round/:uuid')
  async getRound(
    @Param('uuid') uuid: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<RoundDetailResponse | RoundFinishedResponse> {
    const round = await this.gamesService.getRoundByUuid(uuid);
    if (!round) {
      throw new NotFoundException('Round not found');
    }

    const score = await this.gamesService.getOrCreateScore(req.user.sub, uuid);
    const roundWithStatus = this.gamesService.toRoundWithStatus(round);
    const currentUserScore = computeScoreFromTaps(score.taps);

    // For finished rounds — include results
    if (roundWithStatus.status === 'finished') {
      const summary = await this.gamesService.getRoundSummary(uuid);
      return {
        round: roundWithStatus,
        currentUserScore,
        totalScore: summary.totalScore,
        bestPlayer: summary.bestPlayer,
      };
    }

    return { round: roundWithStatus, currentUserScore };
  }

  @Post('tap')
  async tap(
    @Body() body: TapRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<TapResponse> {
    if (!body.roundUuid) {
      throw new BadRequestException('roundUuid is required');
    }

    const result = await this.gamesService.processTap(
      req.user.sub,
      body.roundUuid,
      req.user.role,
    );

    return { score: result.score };
  }

  @Post('round')
  async createRound(@Req() req: AuthenticatedRequest): Promise<CreateRoundResponse> {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admin users can create rounds');
    }

    const round = await this.gamesService.createRound();
    return { round };
  }
}
