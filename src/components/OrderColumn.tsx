import OrderCard from "./OrderCard";
import { driverId } from "../constants";
import type { DriverOrder } from "../types/order.types";
import React from "react";
import "../App.css"

interface OrderColumnProps {
  title: string;
  orders: DriverOrder[];
  sendEvent: (evt: string, payload: any, callback?: (response: any) => void) => void;
  driverId: string; 
}

const actionEventMap: Record<string,string> = {
  "Preparing": "order-accept",
  "Finding Driver": "order-pickup",
  "Out for Delivery": "order-delivered",
}

const OrderColumn: React.FC<OrderColumnProps> = ({ title, orders, sendEvent, driverId }) => {
  const actionLabel = {
    "Preparing": "Accept",
    "Finding Driver": "Pick Up",
    "Out for Delivery": "Delivered",
  }[title]!;

  const handleAction = (order: DriverOrder) => {
    const evt = actionEventMap[title];
    let payload: any = { orderId: order.id }; 

    if (evt === "order-accept") {
      //const assignmentCacheKey = `pending-assignments:${driverId}:${order.id}`;
      payload = {
        orderId: order.id,
        accepted: true,
        cacheKey: order.cacheKey  
      };

    } else if (evt === "order-pickup") {
      payload = {
        orderId: order.id,
        restaurantId: order.orderItems[0]?.restaurantId,
      };

    } else if (evt === "order-delivered") {
      payload = {
        orderId: order.id,
        otp: order.otp
      };

    } else {
      return;
    }

    console.log(`🛰️ Emitting ${evt}:`, payload);
    
    sendEvent(evt, payload, (response: any) => {
      console.log(`✅ ${evt} response:`, response);

      
      
      // if (response?.success) {
      //   if (evt === "order-pickup") {
      //     onStatusUpdate(order.id, 'out_for_delivery');
      //   } else if (evt === "order-delivered") {
      //     onStatusUpdate(order.id, 'delivered');
      //   } else if (evt === "order-accept") {
      //     onStatusUpdate(order.id, 'driver_assigned');
      //   }
      // } else {
      //   console.error(`${evt} failed:`, response?.error || response?.message);
      //   if (evt === "order-delivered" && response?.error) {
      //     alert(`Delivery failed: ${response.error}`);
      //   }
      // }
    });
  }
  
  return (
    <div className="order-column__background">
      <h2 className="order-column__header">{title}</h2>
      {orders.map((order) => (
        <OrderCard 
          key={order.id}
          order={order}
          actionLabel={actionLabel}
          onAction={() => handleAction(order)}
        />
      ))}
    </div>
  );
};

export default OrderColumn;

