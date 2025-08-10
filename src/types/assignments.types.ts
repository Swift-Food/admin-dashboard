interface NewAssignmentPayload {
  type: 'NEW_ORDER_ASSIGNMENT';
  data: {
    orderId: string;
    marketName: string;
    marketAddress: {
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      zipCode: string;
      latitude: number;
      longitude: number;
    };
    estimatedCompensation: string;
    pickupLocation: string;
    deliveryLocation: {
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      zipCode: string;
    };
    items: Array<{
      restaurantName: string;
      restaurantId: string;
      itemName: string;
      quantity: number;
      price: number;
    }>;
    otp: string;
    assignmentTime: string;
    acceptanceDeadline: string;
    eventResponseType: 'order-accept';
    cacheKey: string;
  };
}

export type { NewAssignmentPayload };