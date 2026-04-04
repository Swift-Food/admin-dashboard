import http from "./http";

export interface RestaurantPayout {
  restaurantId: string;
  accountName: string;
  earningsAmount: number;
}

export interface CateringTransfer {
  orderId: string;
  customerName: string;
  eventDate: string;
  status: "paid" | "completed";
  scheduledTransferDate: string | null;
  finalTotal: number | null;
  restaurantPayouts: RestaurantPayout[];
  totalRestaurantPayout: number;
  transferRetryCount: number;
  transferFailureReason: string | null;
  isPastDue: boolean;
}

export interface VenueHireTransfer {
  coworkingOrderId: string;
  cateringOrderId: string | null;
  venueHireFee: number;
  netAmount: number;
  stripeFee: number;
  scheduledTransferDate: string | null;
  isPastDue: boolean;
}

export interface PendingTransfersSummary {
  totalPendingCateringAmount: number;
  totalPendingVenueHireAmount: number;
  totalPendingAmount: number;
  cateringOrderCount: number;
  coworkingOrderCount: number;
}

export interface PendingTransfersResponse {
  summary: PendingTransfersSummary;
  cateringTransfers: CateringTransfer[];
  venueHireTransfers: VenueHireTransfer[];
}

const getPendingTransfers = async (): Promise<PendingTransfersResponse> => {
  const { data } = await http.get<PendingTransfersResponse>(
    "/payments/admin/pending-transfers"
  );
  return data;
};

export default { getPendingTransfers };
