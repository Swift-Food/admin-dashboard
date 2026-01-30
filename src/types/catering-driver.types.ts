// Multi-driver support types for catering meal sessions

export interface RestaurantPickupStatusEntry {
  collectedAt: string;
  pickupProofImageUrl: string;
  collectedBy: string;
  notes?: string;
}

export interface DriverDeliveryConfirmation {
  confirmedAt: string;
  deliveryProofImageUrl: string;
  notes?: string;
}

export interface RestaurantAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface RestaurantContact {
  name?: string;
  phone?: string;
  email?: string;
}

export interface MealSessionRestaurant {
  restaurantId: string;
  restaurantName: string;
  address: RestaurantAddress;
  contact: RestaurantContact;
  collectionTime?: string;
  menuItems: Array<{
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    customerUnitPrice: number;
  }>;
}

export interface MealSessionDelivery {
  address?: string;
  contactName?: string;
  contactPhone?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export type MealSessionDeliveryStatus =
  | "pending"
  | "finding_driver"
  | "driver_assigned"
  | "en_route_to_pickup"
  | "at_pickup"
  | "out_for_delivery"
  | "at_collection_point"
  | "delivered"
  | "cancelled";

export interface DriverMealSessionDto {
  id: string;
  sessionName?: string;
  sessionDate?: string;
  eventTime?: string;
  totalPortions: number;

  // Single driver org account per session
  driverOrgId: string | null;
  driverNames: string[];

  // Per-restaurant pickup tracking
  restaurantPickupStatus: Record<string, RestaurantPickupStatusEntry>;

  // Delivery confirmations (keyed by driverName)
  driverDeliveryConfirmations: Record<string, DriverDeliveryConfirmation>;

  // Optimistic locking
  version: number;

  deliveryStatus: MealSessionDeliveryStatus;
  restaurants: MealSessionRestaurant[];
  delivery: MealSessionDelivery;

  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryAnalyticsDto {
  pendingCount: number;
  activeCount: number;
  completedCount: number;
  totalToday: number;
}

// DTOs for API requests
export interface AcceptMealSessionDto {
  driverOrgId?: string;
  driverNames: string[];
}

export interface UpdateDriverNameDto {
  driverOrgId?: string;
  driverNames: string[];
}

export interface CollectRestaurantDto {
  restaurantId: string;
  pickupProofImageUrl: string;
  collectedBy: string;
  notes?: string;
}

export interface ConfirmDriverDeliveryDto {
  deliveryProofImageUrl: string;
  driverName: string;
  notes?: string;
}
