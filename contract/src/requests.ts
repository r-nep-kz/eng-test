/** Authentication / registration request */
export interface AuthRequest {
  username: string;
  password: string;
}

/** Goose tap request */
export interface TapRequest {
  roundUuid: string;
}
