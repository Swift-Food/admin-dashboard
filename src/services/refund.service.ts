import http from "./http";

export interface AdminIssueRefundDto {
  cateringOrderId: string;
  restaurantId: string;
  amount: number;
  reason?: string;
}

export interface AdminRefundResponse {
  id: string;
  status: "pending" | "approved" | "rejected" | "processed" | "cancelled";
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

export default {
  issueAdminRefund,
};
