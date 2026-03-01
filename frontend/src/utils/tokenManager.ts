import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string | null> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getValidToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('AUTH_TOKEN');
    if (!token) return null;

    // Check if token is expired or about to expire (within 1 hour)
    if (this.isTokenExpiringSoon(token)) {
      return await this.refreshToken();
    }

    return token;
  }

  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      return exp - now < oneHour; // Token expires within 1 hour
    } catch (error) {
      console.error('Error parsing token:', error);
      return true; // If we can't parse, assume it's expired
    }
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    
    return result;
  }

  private async performTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');
      if (!refreshToken) {
        await this.clearTokens();
        return null;
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (response.ok) {
        const data: TokenResponse = await response.json();
        
        await AsyncStorage.multiSet([
          ['AUTH_TOKEN', data.access_token],
          ['REFRESH_TOKEN', data.refresh_token],
        ]);

        return data.access_token;
      } else {
        // Refresh token is also expired
        await this.clearTokens();
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove(['AUTH_TOKEN', 'REFRESH_TOKEN', 'USER_ID']);
  }

  async saveTokens(accessToken: string, refreshToken: string, userId: string): Promise<void> {
    await AsyncStorage.multiSet([
      ['AUTH_TOKEN', accessToken],
      ['REFRESH_TOKEN', refreshToken],
      ['USER_ID', userId],
    ]);
  }
}

export default TokenManager.getInstance();