import OrderCard from "./OrderCard";
import "../App.css"

const OrderColumn = ({ title, orders }) => {
  return (
    <div className="order-column__background">
      <h2 className="order-column__header">{title}</h2>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

export default OrderColumn;
