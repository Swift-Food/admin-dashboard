import http from "./http";
import type { Driver, ActiveOrderResponse, DriverLocationsResponse, LocationData} from "../types/driver.types";
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

const getDriverLocations = async (): Promise<DriverLocationsResponse> => {
  const res = await http.get<DriverLocationsResponse>('/driver-user/allLocations');
  console.log("Driver Locations:", res.data);
  return res.data;
}

const getDriversWithLocations = async (): Promise<Driver[]> => {
  try {
    // Fetch both driver details and locations
    const [driversRes, locationsRes] = await Promise.all([
      getDriverDetails(),
      getDriverLocations()
    ]);

    const drivers = driversRes;
    const locations = locationsRes;

    // Merge location data with driver data
    const driversWithLocations = drivers.map(driver => {
      const locationData = locations[driver.id];
      
      if (locationData) {
        return {
          ...driver,
          currentLocation: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          },
          locationTimestamp: locationData.timestamp,
          locationSource: locationData.source
        };
      }
      
      return driver; // Return driver without location if not found
    });

    console.log(`📍 Merged ${driversWithLocations.length} drivers with location data`);
    console.log(`📍 Drivers with locations: ${driversWithLocations.filter(d => d.currentLocation).length}`);
    
    return driversWithLocations;
  } catch (error) {
    console.error('Error fetching drivers with locations:', error);
    throw error;
  }
};

export { getDriverDetails, getDriverDetailsById, getDriverActiveOrders, getDriverLocations };
export type { Driver, DriverOrder, LocationData, DriverLocationsResponse, ActiveOrderResponse };

