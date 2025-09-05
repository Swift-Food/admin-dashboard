import React, { useEffect, useState } from "react";
import DriverCard from "./DriverCard";
import OrderCard from "./OrderCard";
import { getDriverActiveOrders, getDriverDetailsById } from "../services/driver.service";
import orderService from "../services/order.service";
import type { Driver } from "../types/driver.types";
import type { DriverOrder } from "../types/order.types";

interface DriverRowProps {
  driver: Driver;
  sendEvent?: (evt: string, payload: any, callback?: (response: any) => void) => void;
}

interface ActiveOrderResponse {
  id: string;
  status: string;
  details: {
    type: string;
    data: {
      orderId: string;
      marketName: string;
      // ... other properties
    };
  };
}

const DriverRow: React.FC<DriverRowProps> = ({ driver, sendEvent }) => {
  const [activeOrders, setActiveOrders] = useState<DriverOrder[]>([]);
  const [driverWithUser, setDriverWithUser] = useState<Driver>(driver);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        
        // Fetch full driver details (includes user)
        const fullDriver = await getDriverDetailsById(driver.id);
        if (fullDriver) {
          setDriverWithUser(fullDriver);
        }
        
        // Fetch active orders
        const activeOrderResponse = await getDriverActiveOrders(driver.id);

        const orderIds = activeOrderResponse.map((order: ActiveOrderResponse) => order.details.data.orderId);

        const fullOrderPromises = orderIds.map(orderId =>
          orderService.getOrderById(orderId).catch(err => {
            console.error(`Failed to fetch order ${orderId}:`, err);
            return null;
          })
        );

        const fullOrders = await Promise.all(fullOrderPromises);
        const validOrders = fullOrders.filter((order): order is DriverOrder => order !== null);

        setActiveOrders(validOrders);
      } catch (error) {
        console.error('Failed to fetch driver data:', error);
        setActiveOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [driver.id]);

  return (
    <div className="driver-row__background" style={{ 
      display: "flex", 
      alignItems: "flex-start", 
      marginBottom: 24,
      borderRadius: 8,
      border: "1px solid #e5e7eb",
    }}>
      {/* Driver Card on the left */}
      <div style={{ minWidth: 250}}>
        <DriverCard driver={driverWithUser} />
      </div>
      
      {/* Active Orders on the right */}
      <div style={{ flex: 1, marginLeft: 16 }}>
        
        {loading ? (
          <div style={{ 
            color: "#6b7280",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100px",
            fontWeight: "600",
            fontStyle: "italic"
          }}>Loading orders...
          </div>
        ) : activeOrders.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                sendEvent={sendEvent}
                driverId={driver.id}
              />
            ))}
          </div>
        ) : (
          <div style={{
            color: "#6b7280",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100px",
            fontWeight: "600",
            fontStyle: "italic"
          }}>
            No active orders
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverRow;