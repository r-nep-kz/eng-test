import type {
  AuthRequest,
  AuthResponse,
  RoundsResponse,
  RoundDetailResponse,
  RoundFinishedResponse,
  TapResponse,
  CreateRoundResponse,
} from '../types/api';
import type { ClientUser } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${url}`, {
      headers: this.getAuthHeaders(),
      ...options,
    });

    if (response.status === 401) {
      this.removeToken();
      window.location.href = '/auth';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return response.json();
  }

  async auth(credentials: AuthRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  }

  async getRounds(): Promise<RoundsResponse> {
    return this.request<RoundsResponse>('/rounds');
  }

  async getRound(uuid: string): Promise<RoundDetailResponse | RoundFinishedResponse> {
    return this.request<RoundDetailResponse | RoundFinishedResponse>(`/round/${uuid}`);
  }

  async tap(roundUuid: string): Promise<TapResponse> {
    return this.request<TapResponse>('/tap', {
      method: 'POST',
      body: JSON.stringify({ roundUuid }),
    });
  }

  async createRound(): Promise<CreateRoundResponse> {
    return this.request<CreateRoundResponse>('/round', {
      method: 'POST',
    });
  }

  // --- Token management ---

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  decodeToken(): ClientUser | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const base64Payload = token.split('.')[1];
      if (!base64Payload) return null;
      const payload = JSON.parse(atob(base64Payload));
      return { username: payload.username, role: payload.role };
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    return this.decodeToken()?.role === 'admin';
  }

  getUsername(): string | null {
    return this.decodeToken()?.username ?? null;
  }
}

export const apiService = new ApiService();
