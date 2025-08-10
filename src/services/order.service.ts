import type { DriverOrder } from "../types/order.types";
import http from "./http"

//add polling every 20 seconds 

const getOrdersByDriver = async (driverId: string): Promise<DriverOrder[]> => {
    const res = await http.get(`/order`);
    console.log("Orders:", res);
    return res.data; 
}

/**
 * Generic status updater.  Use this to drive:
 *  - Accept (driver_assigned)
 *  - Pick up (ready_for_pickup or out_for_delivery)
 *  - Deliver (delivered)
 */
const updateOrderStatus = async (
  orderId: string,
  status: "driver_assigned" | "ready_for_pickup" | "out_for_delivery" | "delivered"
): Promise<void> => {
  const res = await http.patch(`/order/${orderId}/status`, { status });
  console.log(`Order ${orderId} status → ${status}`, res.data);
};


export default {
  getOrdersByDriver,
  updateOrderStatus,
};
