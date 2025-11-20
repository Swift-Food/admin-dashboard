// Updated to match backend PricingOrderItemDto structure
export interface PricingAddon {
  addonId: string;
  name: string;
  customerUnitPrice: number;
  quantity: number;
  groupTitle?: string;
}

export interface PricingMenuItem {
  menuItemId: string;
  menuItemName: string;
  /** @deprecated Use menuItemName instead - kept for backward compatibility with old orders */
  name?: string;
  quantity: number;
  customerUnitPrice: number;
  customerTotalPrice: number;
  restaurantBaseUnitPrice: number;
  restaurantBaseTotalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  restaurantNetAmount: number;
  isDiscounted: boolean;
  originalUnitPrice?: number;
  discountAmount?: number;
  selectedAddons?: PricingAddon[];
}

export interface PricingOrderItem {
  restaurantId: string;
  restaurantName: string;
  menuItems: PricingMenuItem[];
  customerSubtotal: number;
  customerTotal: number;
  restaurantGrossAmount: number;
  restaurantNetAmount: number;
  restaurantCommissionTotal: number;
  platformCommissionRevenue: number;
  specialInstructions?: string;
}

// Legacy interface - kept for backward compatibility with old data
export interface CateringOrderItem {
  restaurantId: string;
  restaurantName: string;
  menuItems: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
  }>;
  specialInstructions?: string;
}

export interface CateringOrder {
  id: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventDate: string;
  eventTime: string;
  guestCount?: number;
  eventType?: string;
  deliveryAddress?: string | {
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  specialRequirements?: string;

  // Updated to use new PricingOrderItem structure (backend returns this as 'restaurants')
  restaurants?: PricingOrderItem[];

  // Legacy field - kept for backward compatibility with old data
  orderItems?: CateringOrderItem[];

  // Pricing fields
  customerFinalTotal?: number;
  platformCommissionRevenue?: number;
  restaurantsTotalGross?: number;
  restaurantsTotalNet?: number;

  estimatedTotal?: number;
  finalTotal?: number;
  depositAmount?: number | string;
  subtotal?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  promoDiscount?: number | string;

  status:
    | "pending_review"
    | "admin_reviewed"
    | "restaurant_reviewed"
    | "payment_link_sent"
    | "paid"
    | "confirmed"
    | "cancelled"
    | "completed";

  // Payment fields
  stripePaymentIntentId?: string;
  paid?: boolean;
  paymentLinkUrl?: string;
  paymentLinkSentAt?: string;
  paidAt?: string;

  // Admin fields
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
