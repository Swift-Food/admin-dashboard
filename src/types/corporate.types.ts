// types/corporate.types.ts

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
  organizationId: string;
  organizationName: string;
  orderDate: string;
  requestedDeliveryTime: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  status: CorporateOrderStatusType;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  totalEmployees: number;
  paymentMethod: string;
  paymentCompleted: boolean;
  paidAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  driverId?: string;
  trackingUrl?: string;
  createdAt: string;
}

export interface CorporateSubOrder {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  jobTitle?: string;
  totalAmount: number;
  status: SubOrderStatusType;
  restaurantOrders: RestaurantOrderGroup[];
  specialInstructions?: string;
  dietaryRestrictions?: string[];
}

export interface CorporateOrderDetails extends CorporateOrder {
  deliveryAddressId: string;
  deliveryInstructions?: string;
  requiresApproval: boolean;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  activeSubOrders: CorporateSubOrder[];
  restaurants: {
    restaurantId: string;
    restaurantName: string;
    status: string;
    totalAmount: number;
    itemCount: number;
    employeeCount: number;
    items: {
      employeeName: string;
      name: string;
      quantity: number;
      price: number;
      addons: string[];
    }[];
  }[];
}