export interface Payout {
    id: string;
    driverId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    transactionReference: string;
    paymentMethodId: string;
    paymentMethodSnapshot: any;
    createdAt: string;
    completedAt?: string;
    failedAt?: string;
    processedAt?: string;
    errorMessage?: string;
    worldpayResponse?: any;
    driver: {
      id: string;
      user: {
        email: string;
        phoneNumber: string;
      };
      availableBalance: number;
      lastPayoutDate?: string;
    };
  }