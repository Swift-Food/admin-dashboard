import http from './http';
import type { AxiosResponse } from 'axios';

export interface StripeConnectAccount {
  userId: string;
  eventUserId: string;
  email: string | null;
  username: string | null;
  stripeAccountId: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  createdAt: string;
}

export interface StripeAccountsResponse {
  accounts: StripeConnectAccount[];
  total: number;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

class StripeAccountsService {
  async getAllStripeAccounts(): Promise<StripeConnectAccount[]> {
    const response: AxiosResponse<StripeAccountsResponse> = await http.get(
      '/event-users/admin/stripe-accounts'
    );
    return response.data.accounts;
  }

  async deleteStripeAccount(userId: string): Promise<DeleteAccountResponse> {
    const response: AxiosResponse<DeleteAccountResponse> = await http.delete(
      `/event-users/admin/stripe-accounts/${userId}`
    );
    return response.data;
  }
}

export const stripeAccountsService = new StripeAccountsService();
export default stripeAccountsService;
