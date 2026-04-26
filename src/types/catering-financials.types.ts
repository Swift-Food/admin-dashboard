export interface FinancialOrder {
  orderId: string;
  paymentId: string | null;
  orderDate: string;
  customerEmail: string;
  promoCode: string | null;
  grossOrderValue: number;
  grossExclDelivery: number;
  commission: number;
  deliveryFee: number;
  serviceCharge: number;
  paymentProcessingFee: number;
  invoicingFee: number;
  mscFee: number;
  amountOwedToRestaurant: number;
  totalPlatformRevenue: number;
  profit: number;
}

export interface FinancialTotals {
  orderCount: number;
  grossOrderValue: number;
  grossExclDelivery: number;
  commission: number;
  deliveryFee: number;
  serviceCharge: number;
  paymentProcessingFee: number;
  invoicingFee: number;
  mscFee: number;
  amountOwedToRestaurant: number;
  totalPlatformRevenue: number;
  profit: number;
}

export interface FinancialPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FinancialMetricsResponse {
  orders: FinancialOrder[];
  totals: FinancialTotals;
  pagination: FinancialPagination;
}

export interface FinancialMetricsParams {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface UpdateMscFeesResponse {
  updated: number;
  notFound: string[];
}
