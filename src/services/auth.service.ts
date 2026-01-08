import http from './http';
import type { UserRole } from '../types/user.types';
import type { AxiosResponse } from 'axios';

export interface SignInDto {
  email: string;
  password: string;
  role: UserRole;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  adminMode: boolean;
}

class AuthService {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  async loginConsumer(signInDto: SignInDto): Promise<TokenPair> {
    const response: AxiosResponse<TokenPair> = await http.post<TokenPair>(
      `/auth/login-consumer`,
      signInDto
    );

    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    console.log("logs in fine", response)

    return response.data;
  }

  async refreshAccessToken(): Promise<TokenPair | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }

    try {
      const response: AxiosResponse<TokenPair> = await http.post<TokenPair>(
        `/auth/refresh`,
        { refresh_token: refreshToken }
      );

      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }

      return response.data;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  setIsRefreshing(value: boolean): void {
    this.isRefreshing = value;
  }

  subscribeToTokenRefresh(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  onTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export default new AuthService();
