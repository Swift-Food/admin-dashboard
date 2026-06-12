// Bundle Selection Types
export interface BundleSelection {
  bundleId: string;
  quantity: number;
}

export interface BundleSelectionDetails {
  bundleId: string;
  bundleName: string;
  quantity: number;
  pricePerPerson: number;
  baseGuestCount: number;
  guestsServed: number;
  bundleTotal: number;
}

// Updated to match backend PricingOrderItemDto structure
export interface PricingAddon {
  addonId: string;
  name: string;
  customerUnitPrice: number;
  quantity: number;
  groupTitle?: string;
}

export interface MealSession {
  id: string;
  sessionName: string;
  sessionOrder: number;
  sessionDate: string;
  eventTime: string;
  collectionTime: string;
  guestCount?: number;
  specialRequirements?: string;

  // Order items for this session
  orderItems: PricingOrderItem[];

  // Bundle selections for this session
  bundleSelections?: BundleSelectionDetails[];

  // Session pricing
  subtotal: number;
  deliveryFee: number;
  serviceCharge: number;
  promoDiscount: number;
  promotionDiscount: number;
  sessionTotal: number;
  totalDeliveryPortions?: number;
  requiresCustomQuote?: boolean;
  deliveryFeeOverride?: number | null;

  // Applied promotions for this session
  appliedPromotions?: {
    [restaurantId: string]: Array<{
      id: string;
      name: string;
      type: string;
      discountAmount: number;
    }>;
  };

  // Restaurant reviews for this session
  restaurantReviews?: string[];
  restaurantRejections?: string[];

  // Restaurant-specific collection times
  restaurantCollectionTimes?: {
    [restaurantId: string]: string;
  };

  // Reminders
  reminder24HourSent: boolean;
  reminder1HourSent: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
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
  status: string;
  specialInstructions?: string;
  collectionTime?: string; // ✅ NEW: Restaurant-specific collection time
  reminderConfirmed?: boolean;
  reminderConfirmedAt?: string;

  menuItems: PricingMenuItem[];

  // Restaurant-level totals
  customerTotal: number;
  restaurantGrossAmount: number;
  restaurantCommissionTotal: number;
  restaurantNetAmount: number;

  // Additional fields for display
  sessionName?: string; // ✅ NEW: For multi-meal orders
  sessionDate?: string; // ✅ NEW: For multi-meal orders
  sessionTime?: string; // ✅ NEW: For multi-meal orders
}

// Legacy interface - kept for backward compatibility with old data
export interface CateringOrderItem {
  restaurantId: string;
  restaurantName: string;
  menuItems: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
    menuItemName: string;
  }>;
  specialInstructions?: string;
}

export interface CateringOrder {
  id: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // ============================================================
  // EVENT DETAILS (from primary/first meal session)
  // ============================================================
  eventDate: string;
  eventTime: string;
  collectionTime: string;
  guestCount?: number;
  eventType?: string;
  deliveryAddress?:
    | string
    | {
        street?: string;
        city?: string;
        postcode?: string;
        country?: string;
      };
  specialRequirements?: string;

  // ============================================================
  // ✅ NEW: Multi-meal support
  // ============================================================
  isMultiMeal?: boolean; // Flag to indicate multi-meal order
  mealSessionCount?: number; // Number of meal sessions
  mealSessions?: MealSession[]; // Detailed meal sessions (if multi-meal)

  // ============================================================
  // ORDER ITEMS (aggregated across all sessions for backward compatibility)
  // ============================================================
  // Updated to use new PricingOrderItem structure (backend returns this as 'restaurants')
  restaurants?: PricingOrderItem[];

  /**
   * @deprecated Use mealSessions[].orderItems or restaurants instead.
   * This field is no longer written to by the backend.
   * See: backend/docs/plans/2026-02-10-deprecate-order-orderItems.md
   */
  orderItems?: CateringOrderItem[];

  // ============================================================
  // PRICING (aggregated across all sessions)
  // ============================================================
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
  promotionDiscount?: number;
  promoCodes?: string[];

  // ============================================================
  // STATUS
  // ============================================================
  status:
    | "pending_review"
    | "admin_reviewed"
    | "restaurant_reviewed"
    | "payment_link_sent"
    | "paid"
    | "confirmed"
    | "cancelled"
    | "completed";

  // ============================================================
  // PAYMENT
  // ============================================================
  stripePaymentIntentId?: string;
  paid?: boolean;
  paymentLinkUrl?: string;
  paymentLinkSentAt?: string;
  paidAt?: string;

  // ============================================================
  // ADMIN
  // ============================================================
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  restaurantReviews?: string[];
  restaurantRejections?: string[];

  // ============================================================
  // RESTAURANT PAYOUTS
  // ============================================================
  restaurantPayoutDetails?: {
    [restaurantId: string]: {
      selectedAccountId?: string;
      accountName?: string;
      stripeAccountId?: string;
      earningsAmount?: number;
      selectedAt?: string;
    };
  };

  // ============================================================
  // SHARED ACCESS (customer dashboard users)
  // Per-user accessToken is only populated by the admin list endpoint.
  // ============================================================
  sharedAccessUsers?: Array<{
    userId: string;
    email: string;
    name?: string;
    role: "viewer" | "editor";
    accessToken?: string;
  }>;

  // ============================================================
  // PARTNER SPACE (embed partner that submitted the order, if any)
  // ============================================================
  partnerSpace?: {
    id: string;
    name: string;
  } | null;

  // ============================================================
  // TIMESTAMPS
  // ============================================================
  createdAt: string;
  updatedAt: string;
}

export interface CateringOrderSummary {
  id: string;
  orderReference: string;
  eventDate: string;
  deliveryDate?: string; // Alias for eventDate
  eventTime?: string;
  status: CateringOrder['status'];
  
  // Multi-meal indicators
  isMultiMeal?: boolean;
  mealSessionCount?: number;
  
  customerFinalTotal?: number;
  restaurantCount?: number;
  customerName: string;
  guestCount?: number;
  eventType?: string;
  paid?: boolean;
  createdAt: string;
}

