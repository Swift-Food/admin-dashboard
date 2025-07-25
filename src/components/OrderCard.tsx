const OrderCard = ({ order }) => {
  return (
    <div className="bg-white-50 p-3 rounded border mb-3">
      <p className="font-medium">Order #{order.id}</p>
      <p className="text-sm text-gray-600">{order.customerName}</p>
      <p className="text-xs text-gray-500">{order.address}</p>
    </div>
  );
};

export default OrderCard;
