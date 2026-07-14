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

// Raw shape returned by the backend, which uses "coworking" naming internally.
interface RawPendingTransfersResponse {
  summary: {
    totalPendingCateringAmount: number;
    totalPendingCoworkingAmount: number;
    totalPendingAmount: number;
    cateringOrderCount: number;
    coworkingOrderCount: number;
  };
  cateringTransfers: CateringTransfer[];
  coworkingTransfers: Array<{
    coworkingOrderId: string;
    cateringOrderId: string | null;
    serviceFee: number;
    netAmount: number;
    stripeFee: number;
    scheduledTransferDate: string | null;
    isPastDue: boolean;
  }>;
}

const getPendingTransfers = async (): Promise<PendingTransfersResponse> => {
  const { data } = await http.get<RawPendingTransfersResponse>(
    "/payments/admin/pending-transfers"
  );

  return {
    summary: {
      totalPendingCateringAmount: data.summary.totalPendingCateringAmount,
      totalPendingVenueHireAmount: data.summary.totalPendingCoworkingAmount,
      totalPendingAmount: data.summary.totalPendingAmount,
      cateringOrderCount: data.summary.cateringOrderCount,
      coworkingOrderCount: data.summary.coworkingOrderCount,
    },
    cateringTransfers: data.cateringTransfers,
    venueHireTransfers: data.coworkingTransfers.map((t) => ({
      coworkingOrderId: t.coworkingOrderId,
      cateringOrderId: t.cateringOrderId,
      venueHireFee: t.serviceFee,
      netAmount: t.netAmount,
      stripeFee: t.stripeFee,
      scheduledTransferDate: t.scheduledTransferDate,
      isPastDue: t.isPastDue,
    })),
  };
};

export default { getPendingTransfers };
