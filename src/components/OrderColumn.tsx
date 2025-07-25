import OrderCard from "./OrderCard";

const OrderColumn = ({ title, orders }) => {
  return (
    <div className="flex-1 bg-white p-4 rounded shadow overflow-y-auto max-h-[80vh]">
      <h2 className="text-lg font-semibold mb-4 text-center">{title}</h2>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

export default OrderColumn;
