import { useState, useEffect, useCallback } from "react";
import type { CateringOrder } from "../types/catering.types";
import cateringService from "../services/catering.service";

const CateringOrderDetailsModal = ({ order, isOpen, onClose, onOrderUpdated }: { order: CateringOrder | null; isOpen: boolean; onClose: () => void; onOrderUpdated?: () => void }) => {
  if (!isOpen || !order) return null;

  const formatCurrency = (amount?: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (typeof numAmount === "number" && !isNaN(numAmount)) {
      return `£${numAmount.toFixed(2)}`;
    }
    return "N/A";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Catering Order Details</h2>
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
              <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
              <p className="text-gray-900">{order.customerName}</p>
              <p className="text-sm text-gray-600 mt-1">{order.customerEmail}</p>
              <p className="text-sm text-gray-600">{order.customerPhone}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Event Details</h3>
              <p className="text-gray-900">{new Date(order.eventDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">{order.eventTime}</p>
              <p className="text-sm text-gray-600 mt-2">{order.guestCount} guests</p>
              {order.eventType && <p className="text-sm text-gray-600">{order.eventType}</p>}
            </div>
          </div>

          {typeof order.deliveryAddress === 'string' ? (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>
              <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
            </div>
          ) : order.deliveryAddress && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>
              <p className="text-sm text-gray-600">
                {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.postcode}
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-blue-600">Customer Total</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(order.customerFinalTotal || order.finalTotal || order.estimatedTotal)}</p>
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

          {order.specialRequirements && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
              <h3 className="font-semibold text-yellow-900 mb-2">Special Requirements</h3>
              <p className="text-sm text-yellow-800">{order.specialRequirements}</p>
            </div>
          )}

          {order.adminNotes && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 mb-6">
              <h3 className="font-semibold mb-2 text-gray-900">Admin Notes</h3>
              <p className="text-sm text-gray-800">{order.adminNotes}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Order Items ({(order.restaurants || order.orderItems || []).length})</h3>
            <div className="space-y-2">
              {(order.restaurants || order.orderItems || []).map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.restaurantName}</p>
                      {item.menuItems && item.menuItems.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.menuItems.filter((menuItem) => menuItem != null).map((menuItem, menuIdx) => {
                            const price = menuItem && 'customerTotalPrice' in menuItem
                              ? menuItem.customerTotalPrice
                              : menuItem && 'totalPrice' in menuItem
                              ? menuItem.totalPrice
                              : 0;

                            return (
                              <div key={menuIdx} className="text-sm text-gray-700 flex justify-between">
                                <span>{menuItem.quantity}x {menuItem.name}</span>
                                <span className="font-medium">{formatCurrency(price)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <p className="text-sm text-gray-600 italic mt-2">{item.specialInstructions}</p>
                      )}
                    </div>
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

const CateringOrdersScreen = () => {
  const [allOrders, setAllOrders] = useState<CateringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "completed" | "all">("active");

  const fetchAllOrders = useCallback(async () => {
    try {
      const orders = await cateringService.getOrders();
      setAllOrders(orders);
      setError(undefined);
    } catch (e: any) {
      console.error("Failed to fetch catering orders:", e);
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

  const handleOrderClick = async (order: CateringOrder) => {
    setSelectedOrder(order);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: "bg-yellow-100 text-yellow-800",
      admin_reviewed: "bg-orange-100 text-orange-800",
      restaurant_reviewed: "bg-blue-100 text-blue-800",
      payment_link_sent: "bg-purple-100 text-purple-800",
      paid: "bg-green-100 text-green-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount?: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (typeof numAmount === "number" && !isNaN(numAmount)) {
      return `£${numAmount.toFixed(2)}`;
    }
    return "N/A";
  };

  const filteredOrders = allOrders.filter((order) => {
    // View mode filter
    const activeStatuses = ["pending_review", "admin_reviewed", "restaurant_reviewed", "payment_link_sent", "paid"];
    const completedStatuses = ["confirmed", "completed", "cancelled"];

    let matchesViewMode = true;
    if (viewMode === "active") {
      matchesViewMode = activeStatuses.includes(order.status);
    } else if (viewMode === "completed") {
      matchesViewMode = completedStatuses.includes(order.status);
    }

    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    const matchesSearch =
      searchTerm === "" ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesViewMode && matchesStatus && matchesSearch;
  });

  const statusPriority: Record<string, number> = {
    pending_review: 1,
    admin_reviewed: 2,
    restaurant_reviewed: 3,
    payment_link_sent: 4,
    paid: 5,
    confirmed: 6,
    completed: 7,
    cancelled: 8,
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
        <div className="text-lg text-gray-900">Loading catering orders...</div>
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

  const activeCount = allOrders.filter(o => ["pending_review", "admin_reviewed", "restaurant_reviewed", "payment_link_sent", "paid"].includes(o.status)).length;
  const completedCount = allOrders.filter(o => ["confirmed", "completed", "cancelled"].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Catering Orders</h1>
          <p className="text-lg text-gray-600">Manage and track all catering event orders</p>
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
              <p className="text-sm text-green-700 font-semibold uppercase tracking-wide mb-2">Completed</p>
              <p className="text-4xl font-bold text-green-900">{statusCounts["completed"] || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
              <p className="text-sm text-orange-700 font-semibold uppercase tracking-wide mb-2">Pending Review</p>
              <p className="text-4xl font-bold text-orange-900">{statusCounts["pending_review"] || 0}</p>
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
                placeholder="🔍 Search by customer name, email, order ID, or reference..."
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
                  <option value="pending_review">⏳ Pending Review</option>
                  <option value="admin_reviewed">👤 Admin Reviewed</option>
                  <option value="restaurant_reviewed">🍽️ Restaurant Reviewed</option>
                  <option value="payment_link_sent">📧 Payment Link Sent</option>
                  <option value="paid">💰 Paid</option>
                </>
              )}
              {viewMode === "completed" && (
                <>
                  <option value="confirmed">✅ Confirmed</option>
                  <option value="completed">✔️ Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </>
              )}
              {viewMode === "all" && (
                <>
                  <option value="pending_review">⏳ Pending Review</option>
                  <option value="admin_reviewed">👤 Admin Reviewed</option>
                  <option value="restaurant_reviewed">🍽️ Restaurant Reviewed</option>
                  <option value="payment_link_sent">📧 Payment Link Sent</option>
                  <option value="paid">💰 Paid</option>
                  <option value="confirmed">✅ Confirmed</option>
                  <option value="completed">✔️ Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
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
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Event Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Guests</th>
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
                      <div className="text-sm font-semibold text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500 mt-1">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{new Date(order.eventDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500 mt-1">{order.eventTime}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.guestCount || "N/A"}</div>
                      {order.eventType && <div className="text-xs text-gray-500 mt-1">{order.eventType}</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-base font-bold text-gray-900">
                        {formatCurrency(order.customerFinalTotal || order.finalTotal || order.estimatedTotal)}
                      </div>
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

      <CateringOrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={fetchAllOrders}
      />
    </div>
  );
};

export default CateringOrdersScreen;
