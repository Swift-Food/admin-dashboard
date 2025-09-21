import http from "./http";
import type { Driver, ActiveOrderResponse} from "../types/driver.types";
import type { DriverOrder } from "../types/order.types";

const getDriverDetails = async () : Promise<Driver[]> => {
    const res = await http.get<Driver[]>('/driver-user');
    //console.log("Drivers:", res);
    return res.data;
}

const getDriverDetailsById = async (id:string) : Promise<Driver | null> => {
    const res = await http.get<Driver>(`/driver-user/${id}`);
    return res.data;
}

const getDriverActiveOrders = async (driverId: string): Promise<ActiveOrderResponse[]> => {
  const res = await http.get<ActiveOrderResponse[]>(`driver-user/activeorders/${driverId}`);
  console.log("Driver Active Orders:", res);
  return res.data;
}

export { getDriverDetails, getDriverDetailsById, getDriverActiveOrders };
export type { Driver, DriverOrder };




