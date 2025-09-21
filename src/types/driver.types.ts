interface Driver {
    id: string;
    status: string;
    currentLocation?: {
        latitude: number;
        longitude: number;
    };
    user?: {
        id: string;
        username: string;
    };
    rating: string;
    points: string;
}

export interface ActiveOrderResponse {
  id: string;
  status: string;
  details: {
    type: string;
    data: {
      orderId: string;
      marketName: string;
      marketAddress: {
        id: string;
        name: string;
        addressLine1: string;
        city: string;
        zipcode: string;
        // ... other address properties
      };
      number: string;
      estimatedCompensation: string;
      items: Array<{
        restaurantName: string;
        restaurantId: string;
        menuItems: Array<{
          name: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }>;
      }>;
      assignmentTime: string;
      // ... other properties
    };
  };
}

export type {Driver};