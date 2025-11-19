import { useState, useEffect, useCallback } from "react";
import type {
  AdminCorporateOrderSummary,
  AdminCorporateOrderDetails,
} from "../types/admin-corporate.types";
import corporateService from "../services/corporate.service";

const CorporateOrderDetailsModal = ({ order, isOpen, onClose, onOrderUpdated }: { order: AdminCorporateOrderDetails | null; isOpen: boolean; onClose: () => void; onOrderUpdated?: () => void }) => {
  if (!isOpen || !order) return null;

  const formatCurrency = (amount?: number) => {
    if (typeof amount === "number" && !isNaN(amount)) {
      return `£${amount.toFixed(2)}`;
    }
    return "N/A";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <p className="text-sm text-gray-600 mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Organization</h3>
              <p className="text-gray-900">{order.organizationName}</p>
              <p className="text-sm text-gray-600 mt-1">{order.totalEmployees} employees</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Delivery</h3>
              <p className="text-gray-900">{new Date(order.deliveryDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">{new Date(order.requestedDeliveryTime).toLocaleTimeString()}</p>
              {order.deliveryAddress && (
                <p className="text-sm text-gray-600 mt-2">
                  {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.postcode}
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-blue-600">Customer Total</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(order.customerFinalTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Platform Commission</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(order.platformCommissionRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Restaurant Gross</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(order.restaurantsTotalGross)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Restaurant Net</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(order.restaurantsTotalNet)}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Sub Orders ({order.subOrders?.length || 0})</h3>
            <div className="space-y-2">
              {order.subOrders?.map((subOrder, idx) => (
                <div key={subOrder.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{subOrder.employeeName}</p>
                      <p className="text-sm text-gray-600">{subOrder.employeeEmail}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(subOrder.customerTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CorporateOrdersScreen = () => {
  const [allOrders, setAllOrders] = useState<AdminCorporateOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<AdminCorporateOrderDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "completed" | "all">("active");

  const fetchAllOrders = useCallback(async () => {
    try {
      const orders = await corporateService.getAllOrders();
      setAllOrders(orders);
      setError(undefined);
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

  const handleOrderClick = async (order: AdminCorporateOrderSummary) => {
    try {
      const details = await corporateService.getOrderDetails(order.id);
      setSelectedOrder(details);
    } catch (error) {
      console.error("Failed to load order details:", error);
      alert("Failed to load order details");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      sent_to_restaurant: "bg-purple-100 text-purple-800",
      restaurant_accepted: "bg-indigo-100 text-indigo-800",
      restaurant_rejected: "bg-red-100 text-red-800",
      preparing: "bg-orange-100 text-orange-800",
      out_for_delivery: "bg-cyan-100 text-cyan-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount?: number) => {
    if (typeof amount === "number" && !isNaN(amount)) {
      return `£${amount.toFixed(2)}`;
    }
    return "N/A";
  };

  const filteredOrders = allOrders.filter((order) => {
    // View mode filter
    const activeStatuses = ["pending_approval", "approved", "sent_to_restaurant", "restaurant_accepted", "preparing", "out_for_delivery"];
    const completedStatuses = ["delivered", "cancelled", "rejected", "restaurant_rejected", "failed"];

    let matchesViewMode = true;
    if (viewMode === "active") {
      matchesViewMode = activeStatuses.includes(order.status);
    } else if (viewMode === "completed") {
      matchesViewMode = completedStatuses.includes(order.status);
    }

    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    const matchesSearch =
      searchTerm === "" ||
      order.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderReference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesViewMode && matchesStatus && matchesSearch;
  });

  const statusPriority: Record<string, number> = {
    pending_approval: 1,
    approved: 2,
    sent_to_restaurant: 3,
    restaurant_accepted: 4,
    preparing: 5,
    out_for_delivery: 6,
    delivered: 7,
    cancelled: 8,
    rejected: 9,
    restaurant_rejected: 10,
    failed: 11,
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aPriority = statusPriority[a.status] || 999;
    const bPriority = statusPriority[b.status] || 999;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const statusCounts: Record<string, number> = {};
  allOrders.forEach((order) => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-lg text-gray-900">Loading corporate orders...</div>
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

  const activeCount = allOrders.filter(o => ["pending_approval", "approved", "sent_to_restaurant", "restaurant_accepted", "preparing", "out_for_delivery"].includes(o.status)).length;
  const completedCount = allOrders.filter(o => ["delivered", "cancelled", "rejected", "restaurant_rejected", "failed"].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Corporate Orders</h1>
          <p className="text-lg text-gray-600">Manage and track all corporate catering orders</p>
        </div>

        {/* Quick View Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => { setViewMode("active"); setStatusFilter("ALL"); }}
            className={`px-6 py-3 rounded-xl font-bold text-base transition-all ${
              viewMode === "active"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300"
            }`}
          >
            🔥 Active Orders ({activeCount})
          </button>
          <button
            onClick={() => { setViewMode("completed"); setStatusFilter("ALL"); }}
            className={`px-6 py-3 rounded-xl font-bold text-base transition-all ${
              viewMode === "completed"
                ? "bg-green-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300"
            }`}
          >
            ✅ Completed ({completedCount})
          </button>
          <button
            onClick={() => { setViewMode("all"); setStatusFilter("ALL"); }}
            className={`px-6 py-3 rounded-xl font-bold text-base transition-all ${
              viewMode === "all"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300"
            }`}
          >
            📋 All Orders ({allOrders.length})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8 p-8">
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide mb-2">Total Orders</p>
              <p className="text-4xl font-bold text-blue-900">{allOrders.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <p className="text-sm text-green-700 font-semibold uppercase tracking-wide mb-2">Delivered</p>
              <p className="text-4xl font-bold text-green-900">{statusCounts["delivered"] || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
              <p className="text-sm text-orange-700 font-semibold uppercase tracking-wide mb-2">In Progress</p>
              <p className="text-4xl font-bold text-orange-900">
                {(statusCounts["preparing"] || 0) + (statusCounts["out_for_delivery"] || 0) + (statusCounts["restaurant_accepted"] || 0) + (statusCounts["approved"] || 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-700 font-semibold uppercase tracking-wide mb-2">Cancelled</p>
              <p className="text-4xl font-bold text-gray-900">{statusCounts["cancelled"] || 0}</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by organization, order ID, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                style={{ color: "#000" }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
              style={{ color: "#000", minWidth: "200px" }}
            >
              <option value="ALL">All Statuses</option>
              {viewMode === "active" && (
                <>
                  <option value="pending_approval">⏳ Pending Approval</option>
                  <option value="approved">✅ Approved</option>
                  <option value="sent_to_restaurant">📤 Sent to Restaurant</option>
                  <option value="restaurant_accepted">🍽️ Restaurant Accepted</option>
                  <option value="preparing">👨‍🍳 Preparing</option>
                  <option value="out_for_delivery">🚚 Out for Delivery</option>
                </>
              )}
              {viewMode === "completed" && (
                <>
                  <option value="delivered">✔️ Delivered</option>
                  <option value="cancelled">❌ Cancelled</option>
                  <option value="rejected">🚫 Rejected</option>
                </>
              )}
              {viewMode === "all" && (
                <>
                  <option value="pending_approval">⏳ Pending Approval</option>
                  <option value="approved">✅ Approved</option>
                  <option value="sent_to_restaurant">📤 Sent to Restaurant</option>
                  <option value="restaurant_accepted">🍽️ Restaurant Accepted</option>
                  <option value="preparing">👨‍🍳 Preparing</option>
                  <option value="out_for_delivery">🚚 Out for Delivery</option>
                  <option value="delivered">✔️ Delivered</option>
                  <option value="cancelled">❌ Cancelled</option>
                  <option value="rejected">🚫 Rejected</option>
                </>
              )}
            </select>
          </div>

          {filteredOrders.length > 0 && (
            <div className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredOrders.length}</span> of <span className="font-bold text-gray-900">{allOrders.length}</span> orders
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Delivery Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Employees</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50 transition-colors border-b border-gray-100">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-semibold text-gray-900">{order.organizationName}</div>
                      {order.orderReference && <div className="text-xs text-gray-500 mt-1">Ref: {order.orderReference}</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{new Date(order.deliveryDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(order.requestedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.totalEmployees}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-base font-bold text-gray-900">{formatCurrency(order.customerFinalTotal)}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {order.paid ? (
                        <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 border border-green-300">✓ PAID</span>
                      ) : (
                        <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-700 border border-gray-300">⏳ UNPAID</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <button onClick={() => handleOrderClick(order)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders found matching your criteria</p>
            </div>
          )}
        </div>
      </div>

      <CorporateOrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={fetchAllOrders}
      />
    </div>
  );
};

export default CorporateOrdersScreen;
