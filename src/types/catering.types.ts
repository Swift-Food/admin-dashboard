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
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    eventDate: string;
    eventTime: string;
    guestCount: number;
    eventType?: string;
    deliveryAddress: string | {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        zipcode?: string;
        location?: any;
      };
    specialRequirements?: string;
    orderItems: CateringOrderItem[];
    estimatedTotal?: number;
    finalTotal?: number;
    depositAmount: string;
    status: 'pending_review' | 'reviewed' | 'payment_link_sent' | 'paid' | 'confirmed' | 'cancelled' | 'restaurant_reviewed';
    paymentId?: string;
    paymentLinkUrl?: string;
    paymentLinkSentAt?: string;
    paidAt?: string;
    adminNotes?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    promoCodes?: string[];
    promoDiscount: string;
    subtotal: number;
    serviceCharge: number;
    deliveryFee: number;
    createdAt: string;
    updatedAt: string;
  }