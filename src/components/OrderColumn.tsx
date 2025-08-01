import OrderCard from "./OrderCard";
import type { DriverOrder } from "../types/order.types";
import React from "react";
import "../App.css"

//maps the button text based on the column 

const buttonTextMap: Record<string,string> = {
  "Finding Driver": "Pick up",
  "Preparing": "Accept",
  "Out for Delivery": "Delivered"
};

interface OrderColumnProps {
  title: string;
  orders: DriverOrder[];
}

const OrderColumn: React.FC<OrderColumnProps> = ({ title, orders }) => {
  const actionLabel = buttonTextMap[title];
  
  return (
    <div className="order-column__background">
      <h2 className="order-column__header">{title}</h2>
      {orders.map((order) => (
        <OrderCard 
          key={order.id}
          order={order}
          actionLabel = {actionLabel}/>
      ))}
    </div>
  );
};

export default OrderColumn;
