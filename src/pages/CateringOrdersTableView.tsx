import { useState, useEffect, useCallback } from "react";
import type { CateringOrder } from "../types/catering.types";
import cateringService from "../services/catering.service";

const CateringOrderDetailsModal = ({ order, isOpen, onClose }: { order: CateringOrder | null; isOpen: boolean; onClose: () => void }) => {
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
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold">Catering Order Details</h2>
              <p className="text-purple-100 mt-2 text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-purple-200 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Customer & Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                Customer
              </h3>
              <p className="text-xl font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-sm text-gray-600 mt-2">{order.customerEmail}</p>
              <p className="text-sm text-gray-600">{order.customerPhone}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
                Event Details
              </h3>
              <p className="text-lg font-semibold text-gray-900">{new Date(order.eventDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600 mt-1">{order.eventTime}</p>
              <p className="text-sm text-gray-600 mt-2">{order.guestCount} guests</p>
              {order.eventType && <p className="text-sm text-gray-600">{order.eventType}</p>}
            </div>
          </div>

          {/* Delivery Address */}
          {(typeof order.deliveryAddress === 'string' ? order.deliveryAddress : order.deliveryAddress && `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.postcode}`) && (
            <div className="bg-blue-50 p-6 rounded-xl mb-8 border-2 border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                Delivery Address
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {typeof order.deliveryAddress === 'string'
                  ? order.deliveryAddress
                  : `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}, ${order.deliveryAddress?.postcode}`}
              </p>
            </div>
          )}

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl mb-8 border-2 border-green-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Financial Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-green-700 font-semibold uppercase mb-1">Customer Total</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(order.customerFinalTotal || order.finalTotal || order.estimatedTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold uppercase mb-1">Platform Commission</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(order.platformCommissionRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold uppercase mb-1">Restaurant Gross</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(order.restaurantsTotalGross)}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold uppercase mb-1">Restaurant Net</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(order.restaurantsTotalNet)}</p>
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          {order.specialRequirements && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl mb-8">
              <h3 className="font-bold text-yellow-900 mb-2 text-lg">⚠️ Special Requirements</h3>
              <p className="text-base text-yellow-900 leading-relaxed">{order.specialRequirements}</p>
            </div>
          )}

          {/* Admin Notes */}
          {order.adminNotes && (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-6 mb-8">
              <h3 className="font-bold mb-3 text-gray-900 text-lg">📝 Admin Notes</h3>
              <p className="text-base text-gray-800 leading-relaxed">{order.adminNotes}</p>
            </div>
          )}

          {/* Payment Link */}
          {order.paymentLinkUrl && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-8">
              <h3 className="font-bold mb-3 text-blue-900 text-lg">💳 Payment Link</h3>
              <div className="space-y-2">
                <a
                  href={order.paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 font-medium text-base underline break-all"
                >
                  {order.paymentLinkUrl}
                </a>
                {order.paymentLinkSentAt && (
                  <p className="text-sm text-gray-700">
                    Sent: {new Date(order.paymentLinkSentAt).toLocaleString()}
                  </p>
                )}
                {order.paid && order.paidAt && (
                  <p className="text-sm text-green-700 font-semibold">
                    ✓ Paid: {new Date(order.paidAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Order Items ({(order.restaurants || order.orderItems || []).length} Restaurant{(order.restaurants || order.orderItems || []).length !== 1 ? 's' : ''})</h3>
            <div className="space-y-4">
              {(order.restaurants || order.orderItems || []).map((item, idx) => (
                <div key={idx} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors">
                  <h4 className="font-bold text-xl text-gray-900 mb-4">{item.restaurantName}</h4>
                  {item.menuItems && item.menuItems.length > 0 && (
                    <div className="space-y-2">
                      {item.menuItems.filter((menuItem) => menuItem != null).map((menuItem, menuIdx) => {
                        const price = menuItem && 'customerTotalPrice' in menuItem
                          ? menuItem.customerTotalPrice
                          : menuItem && 'totalPrice' in menuItem
                          ? menuItem.totalPrice
                          : 0;

                        return (
                          <div key={menuIdx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                            <span className="text-base text-gray-900">
                              <span className="font-bold text-purple-600">{menuItem.quantity}x</span> {menuItem.menuItemName}
                            </span>
                            <span className="font-bold text-lg text-gray-900">{formatCurrency(price)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {item.specialInstructions && (
                    <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-r">
                      <p className="text-sm text-yellow-900 italic">Note: {item.specialInstructions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg shadow-lg"
          >
            Close
          </button>
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
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Restaurants</th>
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
                    <td className="px-6 py-5">
                      {(() => {
                        const restaurants = order.restaurants || order.orderItems || [];
                        if (restaurants.length === 0) return <span className="text-sm text-gray-400">No restaurants</span>;
                        if (restaurants.length === 1) {
                          return <div className="text-sm font-medium text-gray-900">{restaurants[0].restaurantName}</div>;
                        }
                        return (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{restaurants[0].restaurantName}</div>
                            <div className="text-xs text-gray-500 mt-1">+{restaurants.length - 1} more</div>
                          </div>
                        );
                      })()}
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
      />
    </div>
  );
};

export default CateringOrdersScreen;
