import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  ShoppingBag,
  Clock,
  Plus,
} from "lucide-react";

import {
  getAllRestaurantsAdminDashboard,
  toggleRestaurantStatus,
  getRestaurantOrders,
} from "../../services/restaurant.service";
import type { RestaurantResponse } from "../../services/restaurant.service";

import { AddRestaurantModal } from "../../components/AddRestaurantModal";
import { SwiftHoursForm } from "../../components/SwiftHoursForm";
import "./RestaurantScreen.css";

const RestaurantAdminDashboard = () => {
  const [restaurants, setRestaurants] = useState<RestaurantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [restaurantOrders, setRestaurantOrders] = useState<
    Record<string, any[]>
  >({});
  const [loadingOrders, setLoadingOrders] = useState<Record<string, boolean>>(
    {}
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getAllRestaurantsAdminDashboard();
      setRestaurants(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (id: string, isOpen: boolean) => {
    try {
      setUpdatingId(id);
      await toggleRestaurantStatus(id, isOpen);
      setRestaurants(
        restaurants.map((r) => (r.id === id ? { ...r, isOpen } : r))
      );
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "An error occurred"}`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string | undefined, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchRestaurantOrders = async (restaurantId: string) => {
    if (restaurantOrders[restaurantId]) return;

    try {
      setLoadingOrders((prev) => ({ ...prev, [restaurantId]: true }));
      const data = await getRestaurantOrders(restaurantId);

      const orders: any[] = [];
      Object.values(data).forEach((restaurantOrders) => {
        Object.values(restaurantOrders).forEach((order) => {
          orders.push(order);
        });
      });

      setRestaurantOrders((prev) => ({ ...prev, [restaurantId]: orders }));
    } catch (err) {
      console.error("Error fetching orders:", err);
      setRestaurantOrders((prev) => ({ ...prev, [restaurantId]: [] }));
    } finally {
      setLoadingOrders((prev) => ({ ...prev, [restaurantId]: false }));
    }
  };

  const handleExpandRestaurant = (restaurantId: string) => {
    const newExpandedId = expandedId === restaurantId ? null : restaurantId;
    setExpandedId(newExpandedId);

    if (newExpandedId && !restaurantOrders[restaurantId]) {
      fetchRestaurantOrders(restaurantId);
    }
  };

  const handleRestaurantCreated = () => {
    fetchRestaurants();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "status-pending",
      PREPARING: "status-preparing",
      READY: "status-ready",
      COMPLETED: "status-completed",
      CANCELLED: "status-cancelled",
    };
    return colors[status] || "status-default";
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-header">
            <AlertCircle className="error-icon" size={24} />
            <div>
              <h3 className="error-title">Error Loading Data</h3>
              <p className="error-message">{error}</p>
            </div>
          </div>
          <button onClick={fetchRestaurants} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Restaurant Management</h1>
            <p className="dashboard-subtitle">
              Manage restaurant availability and view login credentials
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-open flex items-center gap-2"
            style={{ marginLeft: "auto" }}
          >
            <Plus size={20} />
            Add Restaurant
          </button>
        </div>

        <div className="table-container">
          <div className="table-wrapper">
            <table className="restaurants-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Type</th>
                  <th>Market</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((restaurant) => (
                  <React.Fragment key={restaurant.id}>
                    <tr className="restaurant-row">
                      <td>
                        <div>
                          <div className="restaurant-name">
                            {restaurant.restaurant_name}
                          </div>
                          {restaurant.featured && (
                            <span className="featured-badge">Featured</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="type-badge">
                          {restaurant.restaurantType}
                        </span>
                      </td>
                      <td className="market-cell">
                        {restaurant.market?.market_name || "N/A"}
                      </td>
                      <td className="contact-cell">
                        <div>{restaurant.phoneNumber || "N/A"}</div>
                        <div className="contact-email">
                          {restaurant.email || "N/A"}
                        </div>
                      </td>
                      <td>
                        <div className="status-indicator">
                          <div
                            className={`status-dot ${
                              restaurant.isOpen
                                ? "status-dot-open"
                                : "status-dot-closed"
                            }`}
                          ></div>
                          <span
                            className={`status-text ${
                              restaurant.isOpen
                                ? "status-text-open"
                                : "status-text-closed"
                            }`}
                          >
                            {restaurant.isOpen ? "Open" : "Closed"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() =>
                              updateAvailability(
                                restaurant.id,
                                !restaurant.isOpen
                              )
                            }
                            disabled={updatingId === restaurant.id}
                            className={`btn ${
                              restaurant.isOpen ? "btn-close" : "btn-open"
                            }`}
                          >
                            {updatingId === restaurant.id ? (
                              <span className="btn-loading">
                                <div className="btn-spinner"></div>
                                Updating...
                              </span>
                            ) : restaurant.isOpen ? (
                              "Close"
                            ) : (
                              "Open"
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleExpandRestaurant(restaurant.id)
                            }
                            className="btn btn-details"
                          >
                            {expandedId === restaurant.id ? "Hide" : "Show"}{" "}
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === restaurant.id && (
                      <tr>
                        <td colSpan={6} className="expanded-cell">
                          <div className="expanded-content">
                            <div className="credentials-section">
                              <h3 className="section-title">
                                Login Credentials
                              </h3>
                              <div className="credentials-grid">
                                <div className="credential-field">
                                  <label className="field-label">
                                    Username
                                  </label>
                                  <div className="input-group">
                                    <input
                                      type="text"
                                      value={
                                        restaurant.owner?.username || "N/A"
                                      }
                                      readOnly
                                      className="credential-input"
                                    />
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          restaurant.owner?.username,
                                          `username-${restaurant.id}`
                                        )
                                      }
                                      className="icon-button"
                                      title="Copy username"
                                    >
                                      {copiedField ===
                                      `username-${restaurant.id}` ? (
                                        <CheckCircle
                                          size={18}
                                          className="icon-success"
                                        />
                                      ) : (
                                        <Copy
                                          size={18}
                                          className="icon-default"
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="credential-field">
                                  <label className="field-label">
                                    Password
                                  </label>
                                  <div className="input-group">
                                    <input
                                      type={
                                        showPassword[restaurant.id]
                                          ? "text"
                                          : "password"
                                      }
                                      value={
                                        restaurant.owner?.password || "N/A"
                                      }
                                      readOnly
                                      className="credential-input"
                                    />
                                    <button
                                      onClick={() =>
                                        togglePasswordVisibility(restaurant.id)
                                      }
                                      className="icon-button"
                                      title={
                                        showPassword[restaurant.id]
                                          ? "Hide password"
                                          : "Show password"
                                      }
                                    >
                                      {showPassword[restaurant.id] ? (
                                        <EyeOff
                                          size={18}
                                          className="icon-default"
                                        />
                                      ) : (
                                        <Eye
                                          size={18}
                                          className="icon-default"
                                        />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          restaurant.owner?.password,
                                          `password-${restaurant.id}`
                                        )
                                      }
                                      className="icon-button"
                                      title="Copy password"
                                    >
                                      {copiedField ===
                                      `password-${restaurant.id}` ? (
                                        <CheckCircle
                                          size={18}
                                          className="icon-success"
                                        />
                                      ) : (
                                        <Copy
                                          size={18}
                                          className="icon-default"
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="credential-field">
                                  <label className="field-label">
                                    Admin OTP
                                  </label>
                                  <div className="input-group">
                                    <input
                                      type={
                                        showPassword[`otp-${restaurant.id}`]
                                          ? "text"
                                          : "password"
                                      }
                                      value={
                                        restaurant.owner?.adminOtp || "N/A"
                                      }
                                      readOnly
                                      className="credential-input"
                                    />
                                    <button
                                      onClick={() =>
                                        togglePasswordVisibility(
                                          `otp-${restaurant.id}`
                                        )
                                      }
                                      className="icon-button"
                                      title={
                                        showPassword[`otp-${restaurant.id}`]
                                          ? "Hide OTP"
                                          : "Show OTP"
                                      }
                                    >
                                      {showPassword[`otp-${restaurant.id}`] ? (
                                        <EyeOff
                                          size={18}
                                          className="icon-default"
                                        />
                                      ) : (
                                        <Eye
                                          size={18}
                                          className="icon-default"
                                        />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          restaurant.owner?.adminOtp,
                                          `otp-${restaurant.id}`
                                        )
                                      }
                                      className="icon-button"
                                      title="Copy OTP"
                                    >
                                      {copiedField ===
                                      `otp-${restaurant.id}` ? (
                                        <CheckCircle
                                          size={18}
                                          className="icon-success"
                                        />
                                      ) : (
                                        <Copy
                                          size={18}
                                          className="icon-default"
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="info-grid">
                                <div className="info-item">
                                  <span className="info-label">Rating:</span>
                                  <span className="info-value">
                                    {restaurant.averageRating}/5
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">
                                    Commission:
                                  </span>
                                  <span className="info-value">
                                    {restaurant.commission}%
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">
                                    Restaurant #:
                                  </span>
                                  <span className="info-value">
                                    {restaurant.restaurantNumber || "N/A"}
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">FSA:</span>
                                  <span className="info-value">
                                    {restaurant.fsa || "N/A"}
                                  </span>
                                </div>
                              </div>
                              <SwiftHoursForm restaurantId={restaurant.id} />
                            </div>

                            <div className="orders-section">
                              <div className="orders-header">
                                <div className="orders-title-group">
                                  <ShoppingBag size={20} />
                                  <h3 className="section-title">
                                    Ongoing Orders
                                  </h3>
                                </div>
                                {loadingOrders[restaurant.id] && (
                                  <div className="orders-loading">
                                    <div className="orders-spinner"></div>
                                    Loading...
                                  </div>
                                )}
                              </div>

                              {restaurantOrders[restaurant.id]?.length > 0 ? (
                                <div className="orders-list">
                                  {restaurantOrders[restaurant.id].map(
                                    (order) => (
                                      <div
                                        key={order.orderId}
                                        className="order-card"
                                      >
                                        <div className="order-header">
                                          <div>
                                            <div className="order-id">
                                              Order #{order.orderId.slice(0, 8)}
                                            </div>
                                            <div className="order-time">
                                              <Clock size={14} />
                                              <span>
                                                {formatDate(order.timestamp)}
                                              </span>
                                            </div>
                                          </div>
                                          <span
                                            className={`order-status ${getStatusColor(
                                              order.status
                                            )}`}
                                          >
                                            {order.status}
                                          </span>
                                        </div>

                                        <div className="order-items">
                                          {order.items.map((item: any, idx : number) => (
                                            <div
                                              key={idx}
                                              className="order-item"
                                            >
                                              <span className="item-name">
                                                {item.quantity}x {item.menuItemName}
                                              </span>
                                              <span className="item-price">
                                                $
                                                {(
                                                  item.price * item.quantity
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>

                                        {order.specialInstructions && (
                                          <div className="special-instructions">
                                            <p>
                                              <span className="instructions-label">
                                                Special Instructions:
                                              </span>{" "}
                                              {order.specialInstructions}
                                            </p>
                                          </div>
                                        )}

                                        <div className="order-footer">
                                          <div className="prep-time">
                                            {order.prepTimeMinutes && (
                                              <span>
                                                Prep Time:{" "}
                                                {order.prepTimeMinutes} min
                                              </span>
                                            )}
                                          </div>
                                          <div className="order-total">
                                            <div className="total-line">
                                              Total:{" "}
                                              <span className="total-value">
                                                ${order.totalPrice.toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="cost-line">
                                              Restaurant Cost: $
                                              {order.restaurantCost.toFixed(2)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="orders-empty">
                                  {loadingOrders[restaurant.id]
                                    ? "Loading orders..."
                                    : "No ongoing orders"}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {restaurants.length === 0 && (
          <div className="empty-state">
            <p>No restaurants found</p>
          </div>
        )}
      </div>

      <AddRestaurantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRestaurantCreated}
      />
    </div>
  );
};

export default RestaurantAdminDashboard;
