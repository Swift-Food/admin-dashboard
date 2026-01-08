import React, { useState, useEffect, useRef } from "react";
import http from "../services/http";
import { getAllRestaurantsAdminDashboard } from "../services/restaurant.service";
import cateringService from "../services/catering.service";

interface Restaurant {
  id: string;
  restaurant_name: string;
}

interface CateringOrder {
  id: string;
  customerName: string;
  eventDate: string;
}

const MiscellaneousScreen: React.FC = () => {
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<CateringOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [restaurantsData, ordersData] = await Promise.all([
          getAllRestaurantsAdminDashboard(),
          cateringService.getOrders(),
        ]);
        setRestaurants(restaurantsData || []);
        setOrders(ordersData || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOrderDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getOrderRef = (id: string) => id.substring(0, 4).toUpperCase();

  const filteredOrders = orders.filter((order) => {
    const ref = getOrderRef(order.id);
    const searchLower = orderSearch.toLowerCase();
    return (
      ref.toLowerCase().includes(searchLower) ||
      order.customerName?.toLowerCase().includes(searchLower)
    );
  });

  const toggleOrderRef = (ref: string) => {
    setSelectedRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]
    );
  };

  const handleDownloadReceipts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedRefs.length > 0) {
        params.append("refs", selectedRefs.join(","));
      }
      if (restaurantId) {
        params.append("restaurantId", restaurantId);
      }

      const response = await http.get(
        `catering-orders/admin/export-receipts?${params.toString()}`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download failed:", err);
      setError(err.message || "Failed to download receipts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: "#1e293b" }}>
        Miscellaneous
      </h1>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: 600,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: "#334155" }}>
          Download Receipts
        </h2>
        <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>
          Export catering order receipt data to xlsx.
        </p>

        {/* Order References Multi-Select */}
        <div style={{ marginBottom: 16, position: "relative" }} ref={dropdownRef}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
              color: "#475569",
            }}
          >
            Order References
          </label>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              minHeight: 42,
              padding: "6px 12px",
              cursor: "pointer",
            }}
            onClick={() => setShowOrderDropdown(true)}
          >
            {selectedRefs.length === 0 ? (
              <span style={{ color: "#94a3b8", fontSize: 14 }}>
                {loadingData ? "Loading..." : "Select orders..."}
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {selectedRefs.map((ref) => (
                  <span
                    key={ref}
                    style={{
                      background: "#e0e7ff",
                      color: "#3730a3",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {ref}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOrderRef(ref);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 14,
                        color: "#3730a3",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {showOrderDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 10,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                marginTop: 4,
                maxHeight: 300,
                overflow: "hidden",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              <input
                type="text"
                placeholder="Search by ref or customer name..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  borderBottom: "1px solid #e2e8f0",
                  outline: "none",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                autoFocus
              />
              <div style={{ maxHeight: 250, overflowY: "auto" }}>
                {filteredOrders.length > 0 ? (
                  filteredOrders.slice(0, 50).map((order) => {
                    const ref = getOrderRef(order.id);
                    const isSelected = selectedRefs.includes(ref);
                    return (
                      <div
                        key={order.id}
                        onClick={() => toggleOrderRef(ref)}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          background: isSelected ? "#e0e7ff" : "transparent",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: "#1e293b" }}>{ref}</span>
                          <span style={{ color: "#64748b", marginLeft: 8 }}>
                            {order.customerName}
                          </span>
                        </div>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          {order.eventDate
                            ? new Date(order.eventDate).toLocaleDateString("en-GB")
                            : ""}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: 12, color: "#94a3b8", textAlign: "center" }}>
                    {loadingData ? "Loading orders..." : "No orders found"}
                  </div>
                )}
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            Leave empty to export last 100 orders
          </p>
        </div>

        {/* Restaurant Dropdown */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
              color: "#475569",
            }}
          >
            Restaurant (optional)
          </label>
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            disabled={loadingData}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              outline: "none",
              background: "#fff",
              cursor: loadingData ? "not-allowed" : "pointer",
            }}
          >
            <option value="">{loadingData ? "Loading..." : "All restaurants"}</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.restaurant_name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            Filter to only include items for a specific restaurant
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              color: "#dc2626",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleDownloadReceipts}
          disabled={loading || loadingData}
          style={{
            background: loading || loadingData ? "#94a3b8" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || loadingData ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid #fff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              Downloading...
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download Receipts (xlsx)
            </>
          )}
        </button>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default MiscellaneousScreen;
