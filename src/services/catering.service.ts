import http from "./http";
import type { CateringOrder } from "../types/catering.types";

export interface SendPaymentLinkDto {
  orderId: string;
  daysUntilDue?: number;
  ccEmails?: string[];
  publicNote?: string;
  internalNote?: string;
  preview?: boolean;
}

const getOrders = async (): Promise<CateringOrder[]> => {
  const res = await http.get<CateringOrder[]>("catering-orders");
  return res.data;
};

const reviewOrder = async (reviewDto: {
  orderId: string;
  finalTotal?: number; // Keep for backward compatibility
  depositAmount?: number;
  collectionTime?: string;
  sessionRestaurantCollectionTimes?: { // ✅ UPDATED to session-based
    [sessionId: string]: { [restaurantId: string]: string };
  };
  adminNotes?: string;
  reviewedBy: string;
}): Promise<CateringOrder>  => {

  console.log("Reviewing order:", JSON.stringify(reviewDto));
  const res = await http.patch<CateringOrder>(
    `catering-orders/${reviewDto.orderId}/review`,
    reviewDto
  );
  return res.data;
};

const sendPaymentLink = async (payload: SendPaymentLinkDto): Promise<{ success: boolean; message: string; previewHtml?: string }> => {
  const res = await http.post<{ success: boolean; message: string; previewHtml?: string }>("catering-orders/send-payment-link", payload);
  return res.data;
};

const cancelOrder = async (orderId: string): Promise<CateringOrder> => {
  const res = await http.patch<CateringOrder>(`catering-orders/${orderId}/cancel`);
  return res.data;
};

const completeOrder = async (orderId: string): Promise<CateringOrder> => {
  const res = await http.post<CateringOrder>(`catering-orders/${orderId}/complete`);
  return res.data;
};

export default {
  getOrders,
  reviewOrder,
  sendPaymentLink,
  cancelOrder,
  completeOrder,
};
