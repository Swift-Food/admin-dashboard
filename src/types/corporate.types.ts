import type { PricingOrderItem } from './catering.types';

export const CorporateOrderStatus = {
  PENDING_APPROVAL : 'pending_approval',
  APPROVED : 'approved',
  REJECTED : 'rejected',
  SENT_TO_RESTAURANT : 'sent_to_restaurant',
  RESTAURANT_ACCEPTED : 'restaurant_accepted',
  RESTAURANT_REJECTED : 'restaurant_rejected',
  PREPARING : 'preparing',
  OUT_FOR_DELIVERY : 'out_for_delivery',
  DELIVERED : 'delivered',
  CANCELLED : 'cancelled',
  FAILED : 'failed',
  REFUNDED : 'refunded',
} as const

export type CorporateOrderStatusType = typeof CorporateOrderStatus[keyof typeof CorporateOrderStatus];

export const SubOrderStatus = {
  PENDING : 'pending',
  APPROVED : 'approved',
  REJECTED : 'rejected',
  CANCELLED : 'cancelled',
  DELIVERED : 'delivered',
  FAILED : 'failed',
} as const;

export type SubOrderStatusType = typeof SubOrderStatus[keyof typeof SubOrderStatus];

export interface RestaurantOrderGroup {
  restaurantId: string;
  restaurantName: string;
  subtotal: number;
  deliveryFeeShare: number;
  restaurantEarning: number;
  status: 'pending' | 'accepted' | 'rejected' | 'preparing' | 'delivered';
  menuItems: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    restaurantPrice?: number;
    commissionPrice?: number;
    selectedAddons?: {
      name: string;
      price: number;
      quantity: number;
      groupTitle?: string;
    }[];
  }[];
  specialInstructions?: string;
  restaurantAcceptedAt?: Date;
  restaurantRejectedAt?: Date;
  restaurantRejectionReason?: string;
}

export interface CorporateOrder {
  id: string;
  orderReference: string;
  organizationId: string;
  organizationName: string;
  orderDate: string;
  deliveryDate: string;
  deliveryTime: string;
  requestedDeliveryTime: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  cutoffTime?: string;
  status: CorporateOrderStatusType;

  customerFinalTotal: number;
  platformCommissionRevenue: number;
  restaurantsTotalGross: number;
  restaurantsTotalNet: number;

  subtotal?: number;
  taxAmount?: number;
  deliveryFee?: number;
  totalAmount?: number;

  totalEmployees: number;
  paymentMethod?: string;
  paymentCompleted?: boolean;
  paid: boolean;
  paidAt?: string;
  approvedBy?: string;
  approvedByManagerName?: string;
  approvedAt?: string;
  driverId?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateSubOrder {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  jobTitle?: string;

  restaurants: PricingOrderItem[];

  customerTotal: number;
  platformCommission: number;
  restaurantGross: number;
  restaurantNet: number;

  totalAmount?: number;
  restaurantOrders?: RestaurantOrderGroup[];

  status: SubOrderStatusType;
  specialInstructions?: string;
  dietaryRestrictions?: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateOrderDetails extends CorporateOrder {
  deliveryAddress: {
    street: string;
    city: string;
    postcode: string;
    country: string;
  };
  deliveryAddressId?: string;
  deliveryInstructions?: string;
  requiresApproval?: boolean;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  subOrders: CorporateSubOrder[];
  activeSubOrders?: CorporateSubOrder[];

  restaurantBreakdown: PricingOrderItem[];
  restaurants?: PricingOrderItem[];

  stripePaymentIntentId?: string;
  refundedAt?: string;
  refundAmount?: number;
}