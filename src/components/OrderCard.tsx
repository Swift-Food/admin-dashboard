import type { DriverOrder } from "../types/order.types";
import "../App.css"
import React from "react";

interface OrderCardProps {
  order: DriverOrder;
  actionLabel?: string;
  onAction?: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, actionLabel, onAction }) => {
  // extract the restaurant name from the first orderItem
  const restaurantName = order.orderItems[0]?.restaurantName || "—";

  // extract the market name
  const marketName = order.market.market_name;

  // extract the order status 
  const orderStatus = order.status;

  // format the creation timestamp
  const date = new Date(order.placedAt);
  const formatted = date.toLocaleString([], {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="order-card">
      <p className="order-card__id">Order #{order.id}</p>
      <p className="order-card__name">{restaurantName}</p>
      <p className="order-card__address">{marketName}</p>
      <p className = "order-card__status">{orderStatus}</p>
      <p className="order-card__timestamp">{formatted}</p>
      {actionLabel && onAction && (
        <button className="order-card__btn" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
};

export default OrderCard;
