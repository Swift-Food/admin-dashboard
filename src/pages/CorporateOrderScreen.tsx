// CorporateOrdersScreen.tsx

import { Clock, X, Calendar, Users, Building } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type {
  AdminCorporateOrderSummary,
  AdminCorporateOrderDetails,
  CorporateOrderStatusType,
} from "../types/admin-corporate.types";
import { CorporateOrderStatus } from "../types/admin-corporate.types";
import corporateService from "../services/corporate.service";

const OrderTimer = ({ createdAt }: { createdAt: string }) => {
  const [timeElapsed, setTimeElapsed] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const orderTime = new Date(createdAt).getTime();
      const diff = now - orderTime;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      if (days > 0) {
        setTimeElapsed(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeElapsed(`${hours}h`);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        setTimeElapsed(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div className="flex items-center text-sm text-gray-600">
      <Clock size={14} className="mr-1" />
      {timeElapsed} ago
    </div>
  );
};

const CorporateOrderDetailsModal = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}: {
  order: AdminCorporateOrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "" as CorporateOrderStatusType,
    driverId: "",
    trackingUrl: "",
    notes: "",
  });

  if (!isOpen || !order) return null;

  const formatCurrency = (amount?: number) => {
    if (typeof amount === "number" && !isNaN(amount)) {
      return `£${amount.toFixed(2)}`;
    }
    return "N/A";
  };

  const getAvailableStatuses = (
    currentStatus: CorporateOrderStatusType
  ): CorporateOrderStatusType[] => {
    const transitions: Record<CorporateOrderStatusType, CorporateOrderStatusType[]> = {
      [CorporateOrderStatus.PENDING_APPROVAL]: [
        CorporateOrderStatus.APPROVED,
        CorporateOrderStatus.REJECTED,
        CorporateOrderStatus.CANCELLED,
      ],
      [CorporateOrderStatus.APPROVED]: [
        CorporateOrderStatus.SENT_TO_RESTAURANT,
        CorporateOrderStatus.CANCELLED,
      ],
      [CorporateOrderStatus.SENT_TO_RESTAURANT]: [
        CorporateOrderStatus.RESTAURANT_ACCEPTED,
        CorporateOrderStatus.RESTAURANT_REJECTED,
      ],
      [CorporateOrderStatus.RESTAURANT_ACCEPTED]: [
        CorporateOrderStatus.PREPARING,
      ],
      [CorporateOrderStatus.PREPARING]: [
        CorporateOrderStatus.OUT_FOR_DELIVERY,
      ],
      [CorporateOrderStatus.OUT_FOR_DELIVERY]: [
        CorporateOrderStatus.DELIVERED,
        CorporateOrderStatus.FAILED,
      ],
      [CorporateOrderStatus.DELIVERED]: [],
      [CorporateOrderStatus.FAILED]: [CorporateOrderStatus.REFUNDED],
      [CorporateOrderStatus.CANCELLED]: [],
      [CorporateOrderStatus.REJECTED]: [],
      [CorporateOrderStatus.RESTAURANT_REJECTED]: [],
      [CorporateOrderStatus.REFUNDED]: [],
    };

    return transitions[currentStatus] || [];
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.status) {
      alert("Please select a status");
      return;
    }

    setIsUpdating(true);
    try {
      await corporateService.updateDeliveryStatus(
        order.id,
        statusForm.status,
        statusForm.driverId || undefined,
        statusForm.trackingUrl || undefined,
        statusForm.notes || undefined
      );

      setShowStatusModal(false);
      onClose();
      if (onOrderUpdated) onOrderUpdated();
      alert("Order status updated successfully!");
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert(error?.response?.data?.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const canUpdateStatus =
    getAvailableStatuses(order.status as CorporateOrderStatusType).length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Corporate Order Details
            </h2>
            <p className="text-gray-600">
              Order ID: {order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Key Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900">Status</h3>
              <p className="text-blue-700 capitalize font-medium">
                {order.status.replace(/_/g, " ")}
              </p>
              <div className="mt-2">
                <OrderTimer createdAt={order.createdAt} />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900">Organization</h3>
              <p className="text-purple-700 flex items-center">
                <Building size={16} className="mr-1" />
                {order.organizationName}
              </p>
              <p className="text-purple-600 text-sm">
                {order.totalEmployees} employees
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900">Order Date</h3>
              <p className="text-green-700 flex items-center">
                <Calendar size={16} className="mr-1" />
                {new Date(order.orderDate).toLocaleDateString()}
              </p>
              <p className="text-green-600 text-sm">
                Delivery:{" "}
                {new Date(order.requestedDeliveryTime).toLocaleTimeString()}
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-900">Total Amount</h3>
              <p className="text-orange-700 text-xl font-bold">
                {formatCurrency(order.customerFinalTotal)}
              </p>
              <p className="text-orange-600 text-sm">
                {order.paid ? "Paid" : "Unpaid"}
              </p>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-4 text-gray-900">
              Payment Summary
            </h3>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span>Customer Total:</span>
                <span className="font-medium">
                  {formatCurrency(order.customerFinalTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Platform Commission:</span>
                <span className="font-medium">
                  {formatCurrency(order.platformCommissionRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Restaurants Total (Gross):</span>
                <span className="font-medium">
                  {formatCurrency(order.restaurantsTotalGross)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Restaurants Total (Net):</span>
                <span className="font-medium">
                  {formatCurrency(order.restaurantsTotalNet)}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(order.customerFinalTotal)}</span>
              </div>
            </div>
            {order.paidAt && (
              <div className="mt-3 text-sm text-green-700 font-medium">
                Paid: {new Date(order.paidAt).toLocaleString()}
              </div>
            )}
          </div>

          {/* Restaurant Breakdown */}
          {(() => {
            const restaurants = order.restaurantBreakdown || order.restaurants || [];
            if (restaurants.length === 0) return null;

            return (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-4 text-gray-900">
                  Restaurant Breakdown
                </h3>
                <div className="space-y-4">
                  {restaurants.map((restaurant, idx) => (
                    <div
                      key={idx}
                      className="border-l-4 border-blue-300 pl-4 py-2 bg-blue-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-blue-900">
                          {restaurant.restaurantName}
                        </h4>
                      </div>
                      <div className="text-sm text-gray-800">
                        <p>
                          {restaurant.menuItems?.length || 0} items
                        </p>
                        <p className="font-medium">
                          Customer: {formatCurrency(restaurant.customerTotal)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Restaurant Net: {formatCurrency(restaurant.restaurantNetAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Employee Orders */}
          {(() => {
            const subOrders = order.subOrders || order.activeSubOrders || [];
            if (subOrders.length === 0) return null;

            return (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-4 text-gray-900">
                  Employee Orders
                </h3>
                <div className="space-y-3">
                  {subOrders.map((subOrder) => (
                    <div
                      key={subOrder.id}
                      className="bg-gray-50 p-3 rounded border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {subOrder.employeeName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {subOrder.employeeEmail}
                          </p>
                          {subOrder.jobTitle && (
                            <p className="text-xs text-gray-500">
                              {subOrder.jobTitle}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {formatCurrency(subOrder.customerTotal || subOrder.totalAmount)}
                          </p>
                          <p className="text-xs text-gray-600 capitalize">
                            {subOrder.status}
                          </p>
                        </div>
                      </div>
                      {subOrder.specialInstructions && (
                        <p className="text-sm text-gray-700 italic mt-2">
                          Note: {subOrder.specialInstructions}
                        </p>
                      )}
                      {subOrder.dietaryRestrictions &&
                        subOrder.dietaryRestrictions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">
                              Dietary: {subOrder.dietaryRestrictions.join(", ")}
                            </p>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Delivery Info */}
          {(order.driverId || order.trackingUrl) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Delivery Info
              </h3>
              {order.driverId && (
                <p className="text-sm text-yellow-800">
                  Driver ID: {order.driverId}
                </p>
              )}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline hover:text-blue-800"
                >
                  Track Order
                </a>
              )}
            </div>
          )}

          {/* Approval Info */}
          {order.approvedBy && order.approvedAt && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2 text-gray-900">
                Approval Info
              </h3>
              <p className="text-sm text-gray-700">
                Approved by: {order.approvedBy}
              </p>
              <p className="text-sm text-gray-700">
                Approved at: {new Date(order.approvedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>

            {canUpdateStatus && (
              <button
                onClick={() => {
                  setStatusForm({
                    status: "" as CorporateOrderStatusType,
                    driverId: order.driverId || "",
                    trackingUrl: order.trackingUrl || "",
                    notes: "",
                  });
                  setShowStatusModal(true);
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Update Status
              </button>
            )}
          </div>
        </div>
      </div>
      

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-900">
              Update Order Status
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      status: e.target.value as CorporateOrderStatusType,
                    })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Status</option>
                  {getAvailableStatuses(
                    order.status as CorporateOrderStatusType
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver ID (Optional)
                </label>
                <input
                  type="text"
                  value={statusForm.driverId}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, driverId: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg"
                  placeholder="Enter driver ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking URL (Optional)
                </label>
                <input
                  type="text"
                  value={statusForm.trackingUrl}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      trackingUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg"
                  placeholder="Enter tracking URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusForm.notes}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating || !statusForm.status}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-blue-300"
              >
                {isUpdating ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CorporateOrderCard = ({
  order,
  onClick,
}: {
  order: AdminCorporateOrderSummary;
  onClick: () => void;
}) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-blue-100 text-blue-800 border-blue-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      sent_to_restaurant: "bg-purple-100 text-purple-800 border-purple-300",
      restaurant_accepted: "bg-indigo-100 text-indigo-800 border-indigo-300",
      restaurant_rejected: "bg-red-100 text-red-800 border-red-300",
      preparing: "bg-orange-100 text-orange-800 border-orange-300",
      out_for_delivery: "bg-cyan-100 text-cyan-800 border-cyan-300",
      delivered: "bg-green-100 text-green-800 border-green-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
      failed: "bg-red-100 text-red-800 border-red-300",
      refunded: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const formatCurrency = (amount?: number) => {
    if (typeof amount === "number" && !isNaN(amount)) {
      return `£${amount.toFixed(2)}`;
    }
    return "N/A";
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 hover:shadow-md transition-shadow cursor-pointer w-80 mb-3"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium text-sm text-gray-900">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
              order.status
            )}`}
          >
            {order.status.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">
            {formatCurrency(order.customerFinalTotal || order.totalAmount)}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900 flex items-center">
          <Building size={14} className="mr-1" />
          {order.organizationName}
        </p>
        <p className="text-xs text-gray-600 flex items-center mt-1">
          <Users size={14} className="mr-1" />
          {order.totalEmployees} employees
        </p>
      </div>

      <div className="mb-3 bg-blue-50 p-2 rounded border border-blue-200">
        <div className="flex items-center text-sm text-gray-800">
          <Calendar size={14} className="mr-1 text-blue-600" />
          <span className="font-medium">
            {new Date(order.orderDate).toLocaleDateString()}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Delivery: {new Date(order.requestedDeliveryTime).toLocaleTimeString()}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <OrderTimer createdAt={order.createdAt} />
        {(order.paid || order.paymentCompleted) && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            PAID
          </span>
        )}
      </div>
    </div>
  );
};

const CorporateOrderColumn = ({
  title,
  orders,
  onRefresh,
}: {
  title: string;
  orders: AdminCorporateOrderSummary[];
  onRefresh: () => void;
}) => {
  const [selectedOrder, setSelectedOrder] =
    useState<AdminCorporateOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOrderClick = async (order: AdminCorporateOrderSummary) => {
    setIsLoading(true);
    try {
      const details = await corporateService.getOrderDetails(order.id);
      setSelectedOrder(details);
    } catch (error) {
      console.error("Failed to load order details:", error);
      alert("Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-96 bg-gray-100 rounded-lg p-4 border border-gray-300">
      <div className="mb-4 text-center">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="mt-2">
          <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-800 border border-gray-300">
            {orders.length} orders
          </span>
        </div>
      </div>
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {orders.map((order) => (
          <CorporateOrderCard
            key={order.id}
            order={order}
            onClick={() => handleOrderClick(order)}
          />
        ))}
        {orders.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            No orders in this status
          </div>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="text-white text-lg">Loading...</div>
        </div>
      )}

      <CorporateOrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={onRefresh}
      />
    </div>
  );
};

const CorporateOrdersScreen = () => {
  const [allOrders, setAllOrders] = useState<AdminCorporateOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAllOrders = useCallback(async () => {
    try {
      const orders = await corporateService.getAllOrders();
      setAllOrders(orders);
      setError(undefined);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error("Failed to fetch corporate orders:", e);
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOrders();
    const interval = setInterval(fetchAllOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchAllOrders]);

  // Group orders by status
  const buckets: Record<string, CorporateOrder[]> = {
    PENDING_APPROVAL: [],
    APPROVED: [],
    SENT_TO_RESTAURANT: [],
    RESTAURANT_ACCEPTED: [],
    PREPARING: [],
    OUT_FOR_DELIVERY: [],
    DELIVERED: [],
    CANCELLED: [],
  };

  allOrders.forEach((order) => {
    const status = order.status?.toUpperCase() || "";
    if (buckets[status]) {
      buckets[status].push(order);
    } else {
      buckets.PENDING_APPROVAL.push(order);
    }
  });

  // Sort by creation date
  Object.keys(buckets).forEach((key) => {
    buckets[key].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  const totalOrders = allOrders.length;
  const activeOrders =
    totalOrders - buckets.CANCELLED.length - buckets.DELIVERED.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-lg text-gray-900">
          Loading corporate orders...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-red-600 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 h-screen bg-[#e8f4f8]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">
          Corporate Orders Overview
        </h1>
        <div className="flex gap-6 text-sm text-gray-700">
          <span>
            Total Orders:{" "}
            <strong className="text-gray-900">{totalOrders}</strong>
          </span>
          <span>
            Active Orders:{" "}
            <strong className="text-gray-900">{activeOrders}</strong>
          </span>
          <span>
            Delivered:{" "}
            <strong className="text-gray-900">{buckets.DELIVERED.length}</strong>
          </span>
          <span>
            Cancelled:{" "}
            <strong className="text-gray-900">{buckets.CANCELLED.length}</strong>
          </span>
          <span className="ml-auto">
            Last Updated:{" "}
            <strong className="text-gray-900">
              {lastUpdated.toLocaleTimeString()}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto h-full">
        <CorporateOrderColumn
          title={`Pending Approval (${buckets.PENDING_APPROVAL.length})`}
          orders={buckets.PENDING_APPROVAL}
          onRefresh={fetchAllOrders}
        />
        <CorporateOrderColumn
          title={`Approved (${buckets.APPROVED.length})`}
          orders={buckets.APPROVED}
          onRefresh={fetchAllOrders}
        />
        <CorporateOrderColumn
          title={`Sent to Restaurant (${buckets.SENT_TO_RESTAURANT.length})`}
          orders={buckets.SENT_TO_RESTAURANT}
          onRefresh={fetchAllOrders}
        />
        <CorporateOrderColumn
          title={`Accepted (${buckets.RESTAURANT_ACCEPTED.length})`}
          orders={buckets.RESTAURANT_ACCEPTED}
          onRefresh={fetchAllOrders}
        />
        <CorporateOrderColumn
          title={`Preparing (${buckets.PREPARING.length})`}
          orders={buckets.PREPARING}
          onRefresh={fetchAllOrders}
        />
        <CorporateOrderColumn
          title={`Out for Delivery (${buckets.OUT_FOR_DELIVERY.length})`}
          orders={buckets.OUT_FOR_DELIVERY}
          onRefresh={fetchAllOrders}
        />
        <CorporateOrderColumn
          title={`Delivered (${buckets.DELIVERED.length})`}
          orders={buckets.DELIVERED}
          onRefresh={fetchAllOrders}
        />
        <CorporateOrderColumn
          title={`Cancelled (${buckets.CANCELLED.length})`}
          orders={buckets.CANCELLED}
          onRefresh={fetchAllOrders}
        />
      </div>
    </div>
  );
};

export default CorporateOrdersScreen;