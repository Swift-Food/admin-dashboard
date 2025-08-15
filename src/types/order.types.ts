export interface Market {
    market_name: string;
    address: string;
}

export interface OrderItem {
    restaurantName: string;
    restaurantId: string;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'driver_assigned'
  | 'finding_for_driver'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'new-assignment'
  | 'cancelled'
;

export interface DriverOrder {
    id: string;
    cacheKey?: string;
    assignedDriverId?: string; // Optional, used for filtering
    driverId?: string; // Optional, used for filtering
    otp?: string;
    status: OrderStatus;
    placedAt: string;
    market: Market;
    orderItems: OrderItem[];
    deliveryAddress?: {            
    city: string;
    zipcode: string;
  };
}