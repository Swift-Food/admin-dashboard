import type { DriverOrder } from "../types/order.types";
import "../App.css"
import React from "react";

interface OrderCardProps {
  order: DriverOrder;
  actionLabel?: string;
  sendEvent?: (evt: string, payload: any, callback?: (response: any) => void) => void;
  onAction?: () => void;
  isPressed?: boolean; // Optional prop to indicate if the order is pressed
  driverId: string;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, actionLabel, onAction, isPressed = false }) => {
  // Add safety check for orderItems
  const orderItems = order.orderItems || [];

  // extract the restaurant name from the first orderItem
  const restaurantNames = [...new Set(orderItems.map(item => item.restaurantName))];
  const displayName = restaurantNames.length > 1 
    ? `${restaurantNames.join(", ")} (${restaurantNames.length} restaurants)`
    : restaurantNames[0] || "—";

  // extract the market name
  const marketName = order.market?.market_name || "—";

  // extract the order status xw
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
      <p className="order-card__name">{displayName}</p>
      <p className="order-card__address">{marketName}</p>
      <p className = "order-card__status">{orderStatus}</p>
      <p className="order-card__timestamp">{formatted}</p>
      {actionLabel && onAction ? <button 
          className={`order-card__btn ${isPressed ? 'order-card__btn--pressed' : ''}`} 
          onClick={onAction}
          >
            {actionLabel}
          </button> : null}
    </div>
  );
};

export default OrderCard;
