import "../App.css"

const OrderCard = ({ order }) => {
  return (
    <div className="order-card">
      <p className="order-card__id">Order #{order.id}</p>
      <p className="order-card__name">{order.customerName}</p>
      <p className="">{order.address}</p>
    </div>
  );
};

export default OrderCard;
