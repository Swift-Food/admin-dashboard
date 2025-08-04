import OrderCard from "./OrderCard";
import type { DriverOrder } from "../types/order.types";
import React from "react";
import "../App.css"

interface OrderColumnProps {
  title: string;
  orders: DriverOrder[];
  sendEvent: (evt: string, payload: any) => void;
}

const actionEventMap: Record<string,string> = {
  "Preparing": "order-accept",
  "Finding Driver": "order-pickup",
  "Out for Delivery": "order-delivered",
}

const OrderColumn: React.FC<OrderColumnProps> = ({ title, orders, sendEvent }) => {
  const actionLabel = {
    "Preparing": "Accept",
    "Finding Driver": "Pick Up",
    "Out for Delivery": "Delivered",
  } [title]!;

const handleAction = (order: DriverOrder) => {
  const evt = actionEventMap[title];
  let payload: any = {orderId: order.id}; 

  if (evt === "order-accept") {
    payload = {
      orderId: order.id,
      accepted: true,
      cacheKey: order.cacheKey
    };

  } else if (evt === "order-pickup") {

    order.orderItems.forEach(item => {
    const singlePayload = {
      orderId: order.id,
      restaurantId: item.restaurantId,
    };
    console.log("🛰️  Emitting order-pickup:", singlePayload);
    sendEvent("order-pickup", singlePayload);
  });

  } else if (evt === "order-delivered") {
    payload = {
      orderId: order.id,
      otp: order.otp
    };

  } else {
    return;
  }

  console.log(`🛰️  Emitting ${evt}:`, payload)
  sendEvent(evt, payload);
}
  
  return (
    <div className="order-column__background">
      <h2 className="order-column__header">{title}</h2>
      {orders.map((order) => (
        <OrderCard 
          key={order.id}
          order={order}
          actionLabel = {actionLabel}
          onAction = {() => handleAction(order)}
          />
      ))}
    </div>
  );
};

export default OrderColumn;
