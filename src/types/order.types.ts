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
  | 'cancelled'
;

export interface DriverOrder {
    id: string;
    cacheKey?: string;
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