// Types for Catering Delivery / Meal Session Delivery

export type MealSessionDeliveryStatus =
  | "pending"
  | "awaiting_booking"
  | "booked"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "self_delivery";

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

export interface BookingAddressSnapshot {
  location: string;
  postcode: string;
  city: string;
  country: string;
  geolocation: [number, number];
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  notes?: string;
}

export interface CateringDeliveryBooking {
  id: string;
  mealSessionId: string;
  state: BookingState;
  externalOrderId: string;
  externalReference: string | null;
  providerStatus: string | null;
  provider: 'pedivan' | 'pedalme' | 'swift';
  pickupStatus: string | null;
  dropStatus: string | null;
  trackingUrl: string | null;
  quotedPrice: string | null;
  currency: string | null;
  packages: PackageCounts;
  startDate: string;
  endDate: string;
  pickupSnapshot: BookingAddressSnapshot;
  dropSnapshot: BookingAddressSnapshot;
  lastWebhookAt: string | null;
  createdBy: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  serviceTier: string | null;
  taskIds: { pickupIds: string[]; dropoffIds: string[] } | null;
  riderPosition: { lat: number; lng: number; updatedAt: string } | null;
  riderEta: string | null;
}

export type BookableProvider = 'pedivan' | 'pedalme';

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
  /** jsonb column — full per-restaurant order breakdown */
  orderItems?: SessionOrderItem[];
  /** TypeORM decimal columns arrive as strings */
  sessionTotal?: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  createdAt?: string;
  updatedAt?: string;
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
  /** Per-restaurant self/courier decision, stamped at payment or by an admin */
  restaurantFulfillment?: Record<
    string,
    {
      method: "self" | "courier";
      distanceMiles: number;
      rangeMiles: number;
      resolvedAt: string;
    }
  > | null;
}

export interface SelfDeliveryPayout {
  restaurantId: string;
  amount: number;
  note?: string;
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
  miles?: number;
  /** Service level the quote was made at (express = under 2h collection→delivery). */
  isExpress?: boolean;
  /** Minutes between collection and delivery on the session. */
  windowMinutes?: number;
}

/** A courier company the admin can book with, and whether its credentials are set up. */
export interface CourierProviderInfo {
  key: BookableProvider;
  label: string;
  configured: boolean;
}

export interface GetAllSessionsParams {
  status?: MealSessionDeliveryStatus;
  startDate?: string;
  endDate?: string;
}
