import OrderCard from "./OrderCard";
import type { DriverOrder } from "../types/order.types";
import React from "react";

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
      const payload = {
        orderId: order.id,
        accepted: true,
        cacheKey: order.cacheKey
      };

      console.log(`🛰️ Emitting ${evt}:`, payload);
      sendEvent(evt, payload, (response: any) => {
        console.log(`✅ ${evt} response:`, response);
      });

    } else if (evt === "order-pickup") {
      // ✅ Send separate events for each restaurant
      order.orderItems.forEach((orderItem, index) => {
        const payload = {
          orderId: order.id,
          restaurantId: orderItem.restaurantId,
        };

        console.log(`🛰️ Emitting ${evt} for restaurant ${index + 1}:`, payload);
        sendEvent(evt, payload, (response: any) => {
          console.log(`✅ ${evt} response for restaurant ${index + 1}:`, response);
        });
      });

    } else if (evt === "order-delivered") {
      const payload = {
        orderId: order.id,
        otp: order.otp
      };

      console.log(`🛰️ Emitting ${evt}:`, payload);
      sendEvent(evt, payload, (response: any) => {
        console.log(`✅ ${evt} response:`, response);
      });

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

