import http from './http';
import type { UserRole } from '../types/user.types';


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
    const response = await http.post<TokenPair>(
      `/auth/login-consumer`,
      signInDto
    );
    
    // Store tokens in localStorage
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    
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