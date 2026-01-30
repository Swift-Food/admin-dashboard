// Types for Catering Driver / Meal Session Delivery

export type MealSessionDeliveryStatus =
  | "finding_driver"
  | "driver_assigned"
  | "awaiting_pickup"
  | "out_for_delivery"
  | "at_collection_point"
  | "delivered";

export interface SessionMenuItem {
  quantity: number;
  menuItemId: string;
  menuItemName: string;
  menuItemImage?: string;
  customerUnitPrice: number;
  customerTotalPrice: number;
  selectedAddons?: unknown[];
}

export interface SessionOrderItem {
  restaurantId: string;
  restaurantName: string;
  status: string;
  menuItems: SessionMenuItem[];
  customerTotal: number;
  collectionTime?: string;
  restaurantNetAmount: number;
  restaurantGrossAmount: number;
  restaurantCommissionTotal: number;
}

export interface CateringOrderInfo {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  organization?: string;
  eventDate: string;
  eventTime: string;
  collectionTime: string;
  guestCount?: number;
  eventType?: string;
  deliveryAddress: string;
  deliveryLocation?: {
    latitude: number;
    longitude: number;
  };
  specialRequirements?: string;
  status: string;
  finalTotal?: string;
  estimatedTotal?: string;
}

export interface CateringMealSession {
  id: string;
  cateringOrderId: string;

  // Session Details
  sessionName: string;
  sessionOrder: number;
  sessionDate: string;
  eventTime: string;
  collectionTime: string;
  guestCount?: number;
  specialRequirements?: string;

  // Order Items (restaurants)
  orderItems: SessionOrderItem[];
  restaurantCollectionTimes?: Record<string, string>;

  // Pricing
  subtotal: string;
  deliveryFee: string;
  serviceCharge: string;
  promoDiscount: string;
  promotionDiscount: string;
  sessionTotal: string;

  // Driver Info (flat fields)
  driverId?: string;
  driverNames?: string[];
  deliveryMethod?: string;
  driverAssignedAt?: string;

  // Delivery Status
  deliveryStatus: MealSessionDeliveryStatus;

  // Timestamps
  pickupStartedAt?: string;
  outForDeliveryAt?: string;
  arrivedAtDestinationAt?: string;
  deliveredAt?: string;
  estimatedDeliveryTime?: string;

  // Proof Images
  pickupProofImageUrl?: string;
  deliveryProofImageUrl?: string;
  driverNotes?: string;

  // Delay info
  isDelayed?: boolean;
  delayMinutes?: number;

  // Reminders
  reminder24HourSent?: boolean;
  reminder1HourSent?: boolean;

  // Nested catering order with customer/delivery info
  cateringOrder?: CateringOrderInfo;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CateringSessionTrackingDetails {
  session: CateringMealSession;
  route?: CollectionRoute;
  estimatedArrival?: string;
  distanceRemaining?: number;
}

export interface CollectionRoute {
  sessionId: string;
  stops: RouteStop[];
  totalDistance?: number;
  totalDuration?: number;
  optimizedOrder?: number[];
}

export interface RouteStop {
  type: "PICKUP" | "DELIVERY";
  restaurantId?: string;
  restaurantName?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  scheduledTime?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  order: number;
}

// API Response types
export interface GetAllSessionsParams {
  status?: MealSessionDeliveryStatus;
  driverId?: string;
  startDate?: string;
  endDate?: string;
}
