import { RoundWithStatus, BestPlayer } from './models';

/** Authentication response */
export interface AuthResponse {
  access_token: string;
}

/** Tap response */
export interface TapResponse {
  score: number;
}

/** Rounds list */
export type RoundsResponse = RoundWithStatus[];

/** Round details (active / cooldown) */
export interface RoundDetailResponse {
  round: RoundWithStatus;
  currentUserScore: number;
}

/** Finished round details (with results) */
export interface RoundFinishedResponse {
  round: RoundWithStatus;
  currentUserScore: number;
  totalScore: number;
  bestPlayer: BestPlayer | null;
}

/** Create round response */
export interface CreateRoundResponse {
  round: RoundWithStatus;
}

/** API error */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
