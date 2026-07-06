// Types for Catering Delivery / Meal Session Delivery

export type MealSessionDeliveryStatus =
  | "pending"
  | "awaiting_booking"
  | "booked"
  | "out_for_delivery"
  | "delivered"
  | "failed";

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

export interface PackageCounts {
  small: number;
  medium: number;
  large: number;
}

export type BookingState = "active" | "cancelled" | "completed" | "failed";

export interface CateringDeliveryBooking {
  id: string;
  mealSessionId: string;
  state: BookingState;
  pedivanOrderId: string;
  pedivanReference: string | null;
  pedivanStatus: string | null;
  pickupStatus: string | null;
  dropStatus: string | null;
  trackingUrl: string | null;
  quotedPrice: string | null;
  currency: string | null;
  packages: PackageCounts;
  startDate: string;
  endDate: string;
  pickupSnapshot: { location: string; postcode: string };
  dropSnapshot: { location: string; postcode: string };
  lastWebhookAt: string | null;
  createdBy: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface CateringMealSession {
  id: string;
  sessionName: string;
  sessionDate: string;
  eventTime: string;
  collectionTime: string;
  totalDeliveryPortions: number | string;
  deliveryStatus: MealSessionDeliveryStatus;
  estimatedDeliveryTime: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  restaurantPickupAddresses?: Record<
    string,
    {
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      zipcode: string;
      location: { latitude: number; longitude: number };
    }
  >;
  cateringOrder?: CateringOrderInfo;
}

export interface AdminDeliverySession {
  session: CateringMealSession;
  bookings: CateringDeliveryBooking[];
  activeBooking: CateringDeliveryBooking | null;
  suggestedPackages: PackageCounts;
  needsRebooking: boolean;
}

export interface DeliveryPricePreview {
  currency: string;
  price: number;
  starting_price: number;
  meter: number;
  miles: number;
}

export interface GetAllSessionsParams {
  status?: MealSessionDeliveryStatus;
  startDate?: string;
  endDate?: string;
}
