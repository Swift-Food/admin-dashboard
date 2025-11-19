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
