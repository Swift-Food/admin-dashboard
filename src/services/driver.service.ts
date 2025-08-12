import http from "./http";
import type { Driver } from "../types/driver.types";

const getDriverDetails = async () : Promise<Driver[]> => {
    const res = await http.get<Driver[]>('/driver-user');
    console.log("Drivers:", res);
    return res.data;
}

export { getDriverDetails };
export type { Driver };







