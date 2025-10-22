import http from "./http";

export interface SendPaymentLinkDto {
  orderId: string;
  daysUntilDue?: number;
  ccEmails?: string[];
  publicNote?: string;
  internalNote?: string;
  preview?: boolean;
}

const getOrders = async () => {
  const res = await http.get("catering-orders");
  return res.data;
};

const reviewOrder = async (reviewDto: {
  orderId: string;
  finalTotal: number;
  depositAmount?: number;
  adminNotes?: string;
  reviewedBy: string;
}) => {
  console.log("reviewd by", reviewDto);
  const res = await http.patch(
    `catering-orders/${reviewDto.orderId}/review`,
    reviewDto
  );
  return res.data;
};

const sendPaymentLink = async (payload: SendPaymentLinkDto) => {
  const res = await http.post("catering-orders/send-payment-link", payload);
  return res.data;
};

const cancelOrder = async (orderId: string) => {
  const res = await http.patch(`catering-orders/${orderId}/cancel`);
  return res.data;
};

const completeOrder = async (orderId: string) => {
  const res = await http.post(`catering-orders/${orderId}/complete`);
  return res.data;
};

export default {
  getOrders,
  reviewOrder,
  sendPaymentLink,
  cancelOrder,
  completeOrder,
};
