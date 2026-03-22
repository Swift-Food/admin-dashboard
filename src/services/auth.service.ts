import http from './http';
import type { UserRole } from '../types/user.types';
import type { AxiosResponse } from 'axios';

export interface SignInDto {
  email: string;
  password: string;
  role: UserRole;
}

export interface AdminSignInDto {
  email: string;
  password: string;
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

    return response.data;
  }

  async loginAdmin(dto: AdminSignInDto): Promise<TokenPair> {
    const response: AxiosResponse<TokenPair> = await http.post<TokenPair>(
      `/auth/login-admin`,
      dto
    );

    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      this.storeRoleFromToken(response.data.access_token);
    }

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
        this.storeRoleFromToken(response.data.access_token);
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
    localStorage.removeItem('admin_role');
    localStorage.removeItem('adminMode');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getRole(): string {
    return localStorage.getItem('admin_role') || 'admin';
  }

  isPrismoAdmin(): boolean {
    return this.getRole() === 'prismo_admin';
  }

  private storeRoleFromToken(token: string): void {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('admin_role', payload.role || 'admin');
    } catch {
      localStorage.setItem('admin_role', 'admin');
    }
  }
}

export default new AuthService();
