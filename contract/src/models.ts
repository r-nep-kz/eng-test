/** User roles */
export type UserRole = 'user' | 'admin' | 'nikita';

/** Computed round status based on timestamps */
export type RoundStatus = 'cooldown' | 'active' | 'finished';

/** User */
export interface User {
  login: string;
  password_hash: string;
  role: UserRole;
}

/** Round (status computed from timestamps, not stored) */
export interface Round {
  uuid: string;
  created_at: string;
  start_datetime: string;
  end_datetime: string;
}

/** Player score in a round */
export interface Score {
  user: string;
  round: string;
  taps: number;
}

/** Round with computed status (for API responses) */
export interface RoundWithStatus extends Round {
  status: RoundStatus;
}

/** Round's best player */
export interface BestPlayer {
  username: string;
  score: number;
}
