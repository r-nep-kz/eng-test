import { Controller, Get, Post, Param, UseGuards, Req, ForbiddenException, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamesService } from './games.service';
import { 
  RoundsResponse, 
  RoundResponse, 
  RoundWithResultsResponse, 
  TapRequest, 
  TapResponse, 
  CreateRoundResponse, 
  RoundWithScore, 
  RoundWithResults 
} from '@roundsquares/contract';

@Controller()
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Get('rounds')
  @UseGuards(AuthGuard('jwt'))
  async getAllRounds(): Promise<RoundsResponse> {
    return this.gamesService.getAllRounds();
  }

  @Get('round/:uuid')
  @UseGuards(AuthGuard('jwt'))
  async getRound(@Param('uuid') uuid: string, @Req() req: any): Promise<RoundResponse | RoundWithResultsResponse> {
    const round = await this.gamesService.getRoundByUuid(uuid);
    if (!round) {
      throw new NotFoundException('Round not found');
    }

    const score = await this.gamesService.getOrCreateScoreByUserAndRound(req.user.sub, uuid);
    const currentUserScore = this.gamesService.scoreFromTapsCount(score.taps);

    const baseResponse: RoundWithScore = {
      round: round,
      currentUserScore: currentUserScore,
    };

    // Если раунд завершен, добавляем дополнительную информацию
    if (this.gamesService.isRoundFinished(round)) {
      const summary = await this.gamesService.getRoundSummary(uuid);
      const responseWithResults: RoundWithResults = {
        ...baseResponse,
        totalScore: summary.totalScore,
        bestPlayer: summary.bestPlayer,
        currentUserScore: currentUserScore,
      };
      return responseWithResults;
    }
    
    return baseResponse;
  }

  @Post('tap')
  @UseGuards(AuthGuard('jwt'))
  async tap(@Body() body: TapRequest, @Req() req: { uuid: string, user: { sub: string, role: string } }): Promise<TapResponse> {
    if (!body.uuid) {
      throw new BadRequestException('UUID is required');
    }

    const result = await this.gamesService.processTap(req.user.sub, body.uuid, req.user.role);
    return { message: 'tap performed', score: result.score };
  }

  @Post('round')
  @UseGuards(AuthGuard('jwt'))
  async createRound(@Req() req: any): Promise<CreateRoundResponse> {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admin users can create rounds');
    }

    const round = await this.gamesService.createRound();
    return round;
  }
}
