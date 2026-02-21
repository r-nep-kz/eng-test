import type { RoundStatus } from '../types/api';

/**
 * Computes round status based on timestamps.
 * Logic mirrors server-side (contract/src/index.ts).
 */
export function computeRoundStatus(
  startDatetime: string | Date,
  endDatetime: string | Date,
  now: Date = new Date(),
): RoundStatus {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (now < start) return 'cooldown';
  if (now <= end) return 'active';
  return 'finished';
}
