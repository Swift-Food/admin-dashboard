import type { DriverOrder } from "../types/order.types";
import http from "./http"

const getOrdersByDriver = async (driverId: string): Promise<DriverOrder[]> => {
    const res = await http.get(`/order`);
    //console.log("Orders:", res);
    return res.data; 
}

const getOrders = async() => {
  const res = await http.get('order');
  return res.data;
}

const getOrderById = async (orderId: string): Promise<DriverOrder> => {
  const response = await http.get<DriverOrder>(`/order/${orderId}`);
  return response.data;
};

const cancelOrder = async (orderId : string)=>{
  await http.post(`order/cancel/${orderId}`);
}

export default {
  getOrdersByDriver,
  getOrderById,
  getOrders,
  cancelOrder
};
