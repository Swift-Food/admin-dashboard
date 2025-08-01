import type { DriverOrder } from "../types/order.types";
import http from "./http"

const getOrdersbyDriver = async (driverId: string): Promise<DriverOrder[]> => {
    const res = await http.get(`/order/driver/${driverId}`)
    console.log("Orders:", res);
    return res.data; 
}

export default {
    getOrdersbyDriver
};