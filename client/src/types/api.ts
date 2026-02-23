export * from '@roundsquares/contract';

/** Decoded JWT payload on client */
export interface ClientUser {
  username: string;
  role: 'user' | 'admin' | 'nikita';
}
