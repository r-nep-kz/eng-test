export * from './models';
export * from './requests';
export * from './responses';

/**
 * Computes round status based on timestamps.
 * Shared logic for frontend and backend — single source of truth.
 */
export function computeRoundStatus(
  startDatetime: string | Date,
  endDatetime: string | Date,
  now: Date = new Date(),
): 'cooldown' | 'active' | 'finished' {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (now < start) return 'cooldown';
  if (now <= end) return 'active';
  return 'finished';
}

/**
 * Computes score from tap count.
 * 1 tap = 1 point, every 11th tap awards 10 points.
 */
export function computeScoreFromTaps(taps: number): number {
  return taps + Math.floor(taps / 11) * 9;
}
