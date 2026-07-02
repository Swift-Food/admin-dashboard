import http from "./http";

// One refund row as returned by GET /refunds/order/:orderId
export interface RefundRecord {
  id: string;
  status: "pending" | "approved" | "rejected" | "processed" | "cancelled";
  requestedAmount: number;
  approvedAmount: number | null;
  restaurantId: string | null;
  restaurant?: { restaurant_name?: string } | null;
  reason: string | null;
  additionalDetails: string | null;
  adminNotes: string | null;
  stripeRefundId: string | null;
  processingNotes: string | null;
  processedAt: string | null;
  createdAt: string;
  adminReviewedBy: string | null;
  adminReviewedAt: string | null;
}

export interface AdminIssueRefundDto {
  cateringOrderId: string;
  restaurantId: string;
  amount: number;
  reason?: string;
}

export interface AdminRefundResponse {
  id: string;
  status: RefundRecord["status"];
  requestedAmount: number;
  approvedAmount: number | null;
  processingNotes: string | null;
}

const issueAdminRefund = async (
  dto: AdminIssueRefundDto
): Promise<AdminRefundResponse> => {
  const res = await http.post<AdminRefundResponse>("refunds/admin/catering", dto);
  return res.data;
};

// Fetch every refund raised against a catering order (across restaurants).
const getForOrder = async (orderId: string): Promise<RefundRecord[]> => {
  const res = await http.get<RefundRecord[]>(`refunds/order/${orderId}`, {
    params: { orderType: "CATERING" },
  });
  return res.data;
};

export default {
  issueAdminRefund,
  getForOrder,
};
