import type { PricingOrderItem } from './catering.types';

export const CorporateOrderStatus = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENT_TO_RESTAURANT: 'sent_to_restaurant',
  RESTAURANT_ACCEPTED: 'restaurant_accepted',
  RESTAURANT_REJECTED: 'restaurant_rejected',
  PREPARING: 'preparing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type CorporateOrderStatusType = typeof CorporateOrderStatus[keyof typeof CorporateOrderStatus];

export const SubOrderStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const;

export type SubOrderStatusType = typeof SubOrderStatus[keyof typeof SubOrderStatus];

export interface AdminCorporateOrderSummary {
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
  cutoffTime: string;
  status: CorporateOrderStatusType;

  customerFinalTotal: number;
  platformCommissionRevenue: number;
  restaurantsTotalGross: number;
  restaurantsTotalNet: number;

  totalEmployees: number;
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

export interface AdminCorporateOrderDetails extends AdminCorporateOrderSummary {
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

  subOrders: AdminSubOrder[];
  restaurantBreakdown: PricingOrderItem[];

  stripePaymentIntentId?: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface AdminSubOrder {
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

  status: SubOrderStatusType;
  specialInstructions?: string;
  dietaryRestrictions?: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
