import type { DriverOrder } from "../types/order.types";
import http from "./http"

const getOrdersByDriver = async (): Promise<DriverOrder[]> => {
    const res = await http.get<DriverOrder[]>(`/order`);
    return res.data;
}

const getOrders = async(): Promise<DriverOrder[]> => {
  const res = await http.get<DriverOrder[]>('order');
  return res.data;
}

const getOrderById = async (orderId: string): Promise<DriverOrder> => {
  const response = await http.get<DriverOrder>(`/order/${orderId}`);
  return response.data;
};

const cancelOrder = async (orderId: string): Promise<void> => {
  await http.post(`order/cancel/${orderId}`);
}

const assignDriver = async (orderId: string): Promise<void> => {
  await http.post(`driver-user/orders/${orderId}/assign-driver`)
}

export default {
  getOrdersByDriver,
  getOrderById,
  getOrders,
  cancelOrder,
  assignDriver
};
