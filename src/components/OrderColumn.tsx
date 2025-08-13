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
  "Finding Driver": "order-accept",
  "Ready for Pickup": "order-pickup",
  "Out for Delivery": "order-delivered",
}

const OrderColumn: React.FC<OrderColumnProps> = ({ title, orders, sendEvent, driverId }) => {
  const actionLabel = {
    "Finding Driver": "Accept",
    "Ready for Pickup": "Pick up",
    "Out for Delivery": "Delivered",
  }[title]!;

  const handleAction = (order: DriverOrder) => {
    const evt = actionEventMap[title];
    let payload: any = { orderId: order.id }; 

    if (evt === "order-accept") {
      const targetDriverId = (order as any).assignedDriverId || driverId;
      const assignmentCacheKey = `pending-assignments:${targetDriverId}:${order.id}`;
      payload = {
        orderId: order.id,
        accepted: true,
        cacheKey: assignmentCacheKey 
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

