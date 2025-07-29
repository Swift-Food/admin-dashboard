import "../App.css"

const OrderCard = ({ order }) => {
  // parse the ISO string into a nicer format
  const date = new Date(order.timestamp);
  const formatted = date.toLocaleString([], {
    // omit seconds, show date & time
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="order-card">
      <p className="order-card__id">Order #{order.id}</p>
      <p className="order-card__name">{order.customerName}</p>
      <p className="order-card__address">{order.address}</p>
      <p className="order-card__timestamp">{formatted}</p>
    </div>
  );
};

export default OrderCard;
