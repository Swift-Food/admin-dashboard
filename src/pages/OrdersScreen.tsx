import { useEffect, useState, useCallback } from "react";
import orderService from "../services/order.service";
import { Clock, X } from "lucide-react";
import type { DriverOrder, OrderItem } from "../types/order.types";

const OrderTimer = ({ placedAt }: { placedAt: string }) => {
  const [timeElapsed, setTimeElapsed] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const orderTime = new Date(placedAt).getTime();
      const diff = now - orderTime;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeElapsed(`${hours}h ${minutes}m`);
      } else {
        setTimeElapsed(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [placedAt]);

  const getTimerColor = () => {
    const now = new Date().getTime();
    const orderTime = new Date(placedAt).getTime();
    const minutesElapsed = (now - orderTime) / (1000 * 60);

    if (minutesElapsed > 30) return "text-red-500";
    if (minutesElapsed > 15) return "text-yellow-500";
    return "text-gray-500";
  };

  return (
    <div className={`flex items-center text-sm ${getTimerColor()}`}>
      <Clock size={14} className="mr-1" />
      {timeElapsed}
    </div>
  );
};

// Order Details Modal
// Order Details Modal with Cancel Button
const OrderDetailsModal = ({
  order,
  isOpen,
  onClose,
  onCancelOrder, // Add this prop
}: {
  order: DriverOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelOrder?: (orderId: string) => void; // Optional callback for cancel
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!isOpen || !order) return null;
  console.log("order details modal opened");

  // Add error boundary check
  if (!order.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-500">Error: Invalid order data</p>
          <button
            onClick={onClose}
            className="mt-4 bg-gray-200 px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (typeof amount === "number" && !isNaN(amount)) {
      return `${amount.toFixed(2)}`;
    }
    return "N/A";
  };

  const safeOrderId = order.id || "unknown";
  const safeOrderStatus = order.status || "unknown";
  const safePlacedAt = order.placedAt || new Date().toISOString();
  const safeTotalAmount = order.totalAmount || 0;
  console.log("delivery address is", order.deliveryAddress);

  // Determine if order can be cancelled
  const canCancelOrder = !["delivered", "cancelled"].includes(safeOrderStatus);

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      if (onCancelOrder) {
        await orderService.cancelOrder(safeOrderId);
      }
      setShowCancelConfirm(false);
      onClose();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Order Details</h2>
            <p className="text-gray-600">Order ID: {safeOrderId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Status & Timing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Status</h3>
              <p className="text-blue-600 capitalize font-medium">
                {safeOrderStatus.replace("_", " ")}
              </p>
              <div className="mt-2">
                <OrderTimer placedAt={safePlacedAt} />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Placed At</h3>
              <p className="text-green-600">
                {new Date(safePlacedAt).toLocaleDateString()}
              </p>
              <p className="text-green-500 text-sm">
                {new Date(safePlacedAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Total Amount</h3>
              <p className="text-purple-600 text-xl font-bold">
                {order.totalAmount}
              </p>
            </div>
          </div>

          {/* Market Info */}
          {order.market && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Market Information</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Name:</span>{" "}
                  {order.market.market_name || "Unknown"}
                </p>
                {/* <p>
                  <span className="font-medium">Address:</span>{" "}
                  {order.market.address || "No address"}
                </p> */}
              </div>
            </div>
          )}

          {/* Delivery Address Info */}
          {order.deliveryAddress && (
            <div className="border rounded-lg p-4 text-black">
              <h3 className="font-semibold mb-3">Delivery Address</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Zipcode:</span>{" "}
                  {order.deliveryAddress.zipcode || "Unknown"}
                </p>

                {order.deliveryAddress.addressLine1 && (
                  <p>
                    <span className="font-medium">Street:</span>{" "}
                    {order.deliveryAddress.addressLine1}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Customer & Driver Info */}
          {(order.user || order.driver) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {order.user && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {order.user.email || "Unknown"}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {order.user.phoneNumber || "No phone"}
                    </p>
                    {order.user.email && (
                      <p>
                        <span className="font-medium">Email:</span>{" "}
                        {order.user.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {order.driver && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Driver Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {order.driver.name || "Unknown"}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {order.driver.phone || "No phone"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OTP */}
          {order.otp && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">OTP Code</h3>
              <p className="text-2xl font-bold text-yellow-600">{order.otp}</p>
            </div>
          )}

          {/* Order Items */}
          {order.orderItems && order.orderItems.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.orderItems.map((item: OrderItem, itemIndex: number) => (
                  <div
                    key={itemIndex}
                    className="border-l-4 border-blue-200 pl-4 py-2"
                  >
                    <h4 className="font-medium text-blue-800 mb-2">
                      {item.restaurantName || "Unknown Restaurant"}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Restaurant ID: {item.restaurantId || "N/A"}
                    </p>

                    {/* Menu Items if they exist */}
                    {item.menuItems && item.menuItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.menuItems.map((menuItem, menuIndex) => (
                          <div
                            key={menuIndex}
                            className="text-sm text-gray-700"
                          >
                            <p>
                              {menuItem.quantity || 0}x{" "}
                              {menuItem.name || "Unknown Item"} -{" "}
                              {formatCurrency(menuItem.totalPrice)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.specialInstructions && (
                      <div className="mt-2 bg-yellow-50 p-2 rounded">
                        <p className="text-sm text-yellow-700 italic">
                          {item.specialInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-2">
              {order.subtotal && (
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
              )}
              {order.deliveryFee && (
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              {order.taxAmount && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              {order.tip && order.tip > 0 && (
                <div className="flex justify-between">
                  <span>Tip:</span>
                  <span>{formatCurrency(order.tip)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(safeTotalAmount)}</span>
              </div>
              {order.paymentStatus && (
                <div className="mt-2 text-sm text-gray-600">
                  Payment Status:{" "}
                  <span className="capitalize">{order.paymentStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>

            {canCancelOrder && (
              <button
                onClick={handleCancelClick}
                disabled={isCancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold mb-2">Cancel Order?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel order #{safeOrderId.slice(-8)}?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                No, Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-red-300"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Order Card (wider)
const OrderCard = ({
  order,
  onClick,
}: {
  order: DriverOrder;
  onClick: () => void;
}) => {
  // Add error boundary check
  if (!order || !order.id) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border w-80 mb-3">
        <p className="text-red-500 text-sm">Invalid order data</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      placed: "bg-blue-50 text-blue-700",
      confirmed: "bg-green-50 text-green-700",
      preparing: "bg-yellow-50 text-yellow-700",
      driver_assigned: "bg-purple-50 text-purple-700",
      ready_for_pickup: "bg-orange-50 text-orange-700",
      out_for_delivery: "bg-indigo-50 text-indigo-700",
      delivered: "bg-green-50 text-green-700",
      cancelled: "bg-red-50 text-red-700",
    };
    return colors[status] || "bg-gray-50 text-gray-700";
  };

  const formatCurrency = (amount?: number) => {
    if (typeof amount === "number" && !isNaN(amount)) {
      return `${amount.toFixed(2)}`;
    }
    return "N/A";
  };

  const safeOrderStatus = order.status || "unknown";
  const safeOrderId = order.id || "unknown";
  const safePlacedAt = order.placedAt || new Date().toISOString();

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer w-80 mb-3"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium text-sm">#{safeOrderId.slice(-8)}</p>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              safeOrderStatus
            )}`}
          >
            {safeOrderStatus.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <p className="font-bold">{formatCurrency(order.totalAmount)}</p>
        </div>
      </div>

      {/* Market Info */}
      {order.market && (
        <div className="mb-3">
          <p className="text-sm font-medium text-blue-800">
            {order.market.market_name || "Unknown Market"}
          </p>
          {/* <p className="text-xs text-gray-600">
            {order.market.address || "No address"}
          </p> */}
        </div>
      )}

      {/* Delivery Address */}
      {order.deliveryAddress && (
        <div className="mb-3">
          <p className="text-sm font-medium">
            Deliver to: {order.deliveryAddress.city || "Unknown City"}
          </p>
          <p className="text-xs text-gray-600">
            Zipcode: {order.deliveryAddress.zipcode || "N/A"}
          </p>
        </div>
      )}

      {/* Customer Info */}
      {order.user && (
        <div className="mb-3">
          <p className="text-sm font-medium">
            {order.user.email || "Unknown Customer"}
          </p>
          <p className="text-xs text-gray-600">
            {order.user.phoneNumber || "No phone"}
          </p>
        </div>
      )}

      {/* OTP */}
      {order.otp && (
        <div className="mb-3 bg-yellow-50 p-2 rounded text-center">
          <p className="text-xs text-yellow-700 font-medium">
            OTP: {order.otp}
          </p>
        </div>
      )}

      {/* Timer and timestamp */}
      <div className="flex justify-between items-center">
        <OrderTimer placedAt={safePlacedAt} />
        <p className="text-xs text-gray-500">
          {new Date(safePlacedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

// Order Column Component
const OrderColumn = ({
  title,
  orders,
}: {
  title: string;
  orders: DriverOrder[];
}) => {
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);

  return (
    <div className="flex-shrink-0 w-96 bg-gray-100 rounded-lg p-4">
      <div className="mb-4 text-center text-black">
        <h3 className="font-semibold ">{title}</h3>
        <div className="mt-2">
          <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium">
            {orders.length} orders
          </span>
        </div>
      </div>
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={() => setSelectedOrder(order)}
          />
        ))}
        {orders.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No orders in this status
          </div>
        )}
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};

// Main AllOrdersScreen Component
const OrdersScreen = () => {
  const [allOrders, setAllOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch all orders using your dedicated API
  const fetchAllOrders = useCallback(async () => {
    try {
      console.log("🔄 Fetching all orders from system API...");

      const orders = await orderService.getOrders();
      console.log(orders);

      console.log(`📊 Fetched ${orders.length} total orders from system`);

      setAllOrders(orders);
      setError(undefined);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error("Failed to fetch all orders:", e);
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);

      if (isVisible) {
        console.log("📱 Page became visible - refreshing all orders");
        fetchAllOrders();
      } else {
        console.log("📱 Page became hidden - pausing polling");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAllOrders]);

  // Poll for updates when page is visible
  useEffect(() => {
    if (!isPageVisible) {
      return;
    }

    console.log("⏰ Starting polling for all orders");
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchAllOrders();
      }
    }, 10000); // Poll every 15 seconds

    return () => {
      console.log("⏰ Stopping polling for all orders");
      clearInterval(pollInterval);
    };
  }, [fetchAllOrders, isPageVisible]);

  // Organize orders by status into buckets
  const buckets: Record<string, DriverOrder[]> = {
    PLACED: [],
    CONFIRMED: [],
    PREPARING: [],
    DRIVER_ASSIGNED: [],
    FINDING_FOR_DRIVER: [],
    READY_FOR_PICKUP: [],
    OUT_FOR_DELIVERY: [],
    DELIVERED: [],
    NEW_ASSIGNMENT: [],
    CANCELLED: [],
  };

  // Categorize all orders by their status
  allOrders.forEach((order) => {
    switch (order.status) {
      case "placed":
        buckets.PLACED.push(order);
        break;
      case "confirmed":
        buckets.CONFIRMED.push(order);
        break;
      case "preparing":
        buckets.PREPARING.push(order);
        break;
      case "driver_assigned":
        buckets.DRIVER_ASSIGNED.push(order);
        break;

      case "ready_for_pickup":
        buckets.READY_FOR_PICKUP.push(order);
        break;
      case "out_for_delivery":
        buckets.OUT_FOR_DELIVERY.push(order);
        break;
      case "delivered":
        buckets.DELIVERED.push(order);
        break;

      case "cancelled":
        buckets.CANCELLED.push(order);
        break;
      default:
        console.warn(`Unknown order status: ${order.status}`, order);
        buckets.PLACED.push(order);
    }
  });

  // Sort all buckets by placedAt timestamp (newest first)
  Object.keys(buckets).forEach((key) => {
    buckets[key].sort((a, b) => {
      const aTime = new Date(a.placedAt).getTime();
      const bTime = new Date(b.placedAt).getTime();
      return bTime - aTime; // Newest first
    });
  });

  // Calculate summary statistics
  const totalOrders = allOrders.length;
  const activeOrders =
    buckets.PLACED.length +
    buckets.CONFIRMED.length +
    buckets.PREPARING.length +
    buckets.DRIVER_ASSIGNED.length +
    buckets.FINDING_FOR_DRIVER.length +
    buckets.READY_FOR_PICKUP.length +
    buckets.OUT_FOR_DELIVERY.length +
    buckets.NEW_ASSIGNMENT.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading all orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 h-screen bg-[#e8f4f8]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">All Orders Overview</h1>
        <div className="flex gap-6 text-sm text-gray-600">
          <span>
            Total Orders: <strong>{totalOrders}</strong>
          </span>
          <span>
            Active Orders: <strong>{activeOrders}</strong>
          </span>
          <span>
            Delivered: <strong>{buckets.DELIVERED.length}</strong>
          </span>
          <span>
            Cancelled: <strong>{buckets.CANCELLED.length}</strong>
          </span>
          <span className="ml-auto">
            Last Updated: <strong>{lastUpdated.toLocaleTimeString()}</strong>
          </span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto h-full">
        <OrderColumn
          title={`Placed (${buckets.PLACED.length})`}
          orders={buckets.PLACED}
        />
        {/* <OrderColumn 
                title={`New Assignment (${buckets.NEW_ASSIGNMENT.length})`} 
                orders={buckets.NEW_ASSIGNMENT} 
            />
            <OrderColumn 
                title={`Finding Driver (${buckets.FINDING_FOR_DRIVER.length})`} 
                orders={buckets.FINDING_FOR_DRIVER} 
            /> */}
        <OrderColumn
          title={`Preparing (${buckets.PREPARING.length})`}
          orders={buckets.PREPARING}
        />
        <OrderColumn
          title={`Driver Assigned (${buckets.DRIVER_ASSIGNED.length})`}
          orders={buckets.DRIVER_ASSIGNED}
        />
        <OrderColumn
          title={`Ready for Pickup (${buckets.READY_FOR_PICKUP.length})`}
          orders={buckets.READY_FOR_PICKUP}
        />
        <OrderColumn
          title={`Out for Delivery (${buckets.OUT_FOR_DELIVERY.length})`}
          orders={buckets.OUT_FOR_DELIVERY}
        />
        <OrderColumn
          title={`Delivered (${buckets.DELIVERED.length})`}
          orders={buckets.DELIVERED}
        />
        <OrderColumn
          title={`Cancelled (${buckets.CANCELLED.length})`}
          orders={buckets.CANCELLED}
        />
      </div>
    </div>
  );
};

export default OrdersScreen;
