import http from "./http"

const getOrdersbyDriver = async (driverId: string) => {
    const response = await http.get(`/driver-user/allorders/${driverId}`);
    console.log("Orders:", response);
    
    return response.data; 
}

export default {
    getOrdersbyDriver
}