import OrderCard from "./OrderCard";
import "../App.css"

const buttonTextMap: Record<string,string> = {
  "Finding Driver": "Pick up",
  "Preparing": "Accept",
  "Out of Delivery": "Delivered"
};

const OrderColumn = ({ title, orders }) => {
  return (
    <div className="order-column__background">
      <h2 className="order-column__header">{title}</h2>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} actionLabel = {buttonTextMap[title]}/>
      ))}
    </div>
  );
};

export default OrderColumn;
