interface NewAssignmentPayload {
  type: 'NEW_ORDER_ASSIGNMENT';
  data: {
    orderId: string;
    marketName: string;
    marketAddress: {
      id: string;
      userId: string;
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      zipcode: string;
      location: {
        latitude: number;
        longitude: number;
      };
      isDefault: boolean;
      statsToMarkets: Array<{
        marketId: string;
        time: number;
        distance: number;
      }>;
      user: {
        id: string;
        verified: boolean;
        email: string;
        phoneNumber?: string;
        username: string;
        password: string;
        profilePicture?: string;
        role: string;
        createdAt: string;
        updatedAt: string;
        tokens?: any;
      };
    };
    number: string; // Phone number
    estimatedCompensation: string;
    retryAttempt: number;
    pickupLocation: string;
    deliveryLocation: {
      id: string;
      userId: string;
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      zipcode: string;
      location: {
        latitude: number;
        longitude: number;
      };
      isDefault: boolean;
      statsToMarkets: any[];
    };
    items: Array<{
      status: string;
      menuItems: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        menuItemId: string;
        totalPrice: number;
      }>;
      totalPrice: number;
      restaurantId: string;
      restaurantCost: number;
      restaurantName: string;
    }>;
    assignmentTime: string;
    acceptanceDeadline: string;
    eventResponseType: 'order-accept';
    cacheKey: string;
    isRetry: boolean;
    urgencyLevel: string;
    // Note: otp is NOT in the actual JSON
  };
}

export type { NewAssignmentPayload };