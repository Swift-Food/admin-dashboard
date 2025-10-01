import type { Address } from "./address.types";
import type { Market } from "./market.types";
import type { DriverUser } from "./user.types";
import type { User } from "./user.types";


// Order Status Types (using const assertions instead of enums)
export const OrderStatus = {
  PLACED: "placed",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  DRIVER_ASSIGNED: "driver_assigned",
  READY_FOR_PICKUP: "ready_for_pickup",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export interface Order {
  id: string;
  user: User;
  userId: string;
  userToken?: string;
  driverToken?: string;
  restaurantToken?: string[];
  market: Market;
  marketId: string;
  pickupOtp?: string;
  otp?: string;
  orderItems: OrderItem[];
  subtotal: number;
  restaurantTotalCost: number;
  taxAmount: number;
  driverTotalCost: number;
  deliveryFee: number;
  tip?: number;
  serviceCharge?: number;
  totalAmount: number;
  discountCode?: string;
  deliveryAddress: Address;
  deliveryAddressId: string;
  payment: Payment;
  paymentId: string;
  paymentMethod?: string;
  transactionReference?: string;
  cardHolderName?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  actualDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
  driver?: DriverUser;
  driverId?: string;
  completedDriverId?: string;
  driverLocationKey?: string;
  promoCodes?: string[];
  promoCodeIds?: string[];
  cancelledBy?: "USER" | "RESTAURANT" | "SYSTEM";
  isRated?: boolean;
  rating?: number;
}

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderPossibleStatus = {
  INCOMING: "incoming",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

export type OrderPossibleStatus =
  (typeof OrderPossibleStatus)[keyof typeof OrderPossibleStatus];

export const PaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// Related Entity Interfaces
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
}
export interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Order Item Interface (full structure from backend)
export interface OrderItem {
  restaurantId: string;
  restaurantName: string;
  menuItems: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedAddons?: {
      name: string;
      price: number;
      quantity: number;
      groupTitle?: string;
    }[];
  }[];
  status: OrderStatus;
  restaurantCost: number;
  totalPrice: number;
  specialInstructions?: string;
}

// Main Order Interface (matches backend entity structure)
export interface DriverOrder {
  // Primary fields
  id: string;
  userId: string;
  marketId: string;

  // Status and timing
  status: OrderStatus;
  placedAt: string;
  createdAt: string;
  updatedAt: string;

  // Order content
  orderItems: OrderItem[];

  // Pricing breakdown (all as numbers, not decimals)
  subtotal: number;
  restaurantTotalCost: number;
  taxAmount: number;
  driverTotalCost: number;
  deliveryFee: number;
  tip: number;
  totalAmount: number;

  // Discounts and promos
  discountCode?: string;
  discountAmount: number;
  promoCodes?: string[];
  promoCodeIds?: string[];

  // OTP codes
  otp?: string;
  pickupOtp?: string;

  // Driver information
  driverId?: string;
  completedDriverId?: string;
  driverLocationKey?: string;

  // Payment information
  paymentId?: string;
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  transactionId?: string;

  // Notification tokens
  userToken?: string;
  driverToken?: string;
  restaurantToken?: string[];

  // Delivery timing
  estimatedDeliveryTime?: number;
  actualDeliveryTime?: string;

  // Rating and feedback
  isRated: boolean;
  rating?: number;

  // Cancellation info
  cancelledBy?: "USER" | "RESTAURANT" | "SYSTEM";

  // Relations (populated when included)
  user?: User;
  driver?: Driver;
  market: Market;
  deliveryAddress?: Address;
  payment?: Payment;

  // Legacy/compatibility fields for existing components
  cacheKey?: string;
  assignedDriverId?: string;
}

// Component Props Interfaces
export interface OrderColumnProps {
  title: string;
  orders: DriverOrder[];
}

export interface OrderCardProps {
  order: DriverOrder;
  onClick: () => void;
}

export interface OrderDetailsModalProps {
  order: DriverOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface OrderTimerProps {
  placedAt: string;
}

// Utility Types
export type CancellationReason = "USER" | "RESTAURANT" | "SYSTEM";
