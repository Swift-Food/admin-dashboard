import React, { useState, useEffect, useRef } from "react";
import http from "../services/http";
import { getAllRestaurantsAdminDashboard } from "../services/restaurant.service";
import cateringService from "../services/catering.service";

interface Restaurant {
  id: string;
  restaurant_name: string;
}

interface OrderRestaurant {
  restaurantId: string;
  restaurantName: string;
  customerTotal: number;
  commissionRate?: number;
}
interface CateringOrder {
  id: string;
  customerName: string;
  eventDate: string;
  restaurants?: OrderRestaurant[];
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

  // Preview-invoice card state
  const [previewOrderId, setPreviewOrderId] = useState<string>("");
  const [previewOrderSearch, setPreviewOrderSearch] = useState<string>("");
  const [previewLoadingType, setPreviewLoadingType] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Which restaurant on the picked order to preview per-restaurant docs
  // for. Auto-set when the order has exactly one non-Swift restaurant.
  const [previewRestaurantId, setPreviewRestaurantId] = useState<string>("");

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

  // HMRC issued Swift's VAT registration with effective date 2026-04-01;
  // supplies before that are pre-registration and have no VAT invoice to
  // preview, so the picker only lists orders whose event date is in the
  // VAT-registered period.
  const VAT_EFFECTIVE_DATE = new Date("2026-04-01T00:00:00Z").getTime();
  const previewFilteredOrders = orders.filter((order) => {
    if (!order.eventDate) return false;
    const eventTime = new Date(order.eventDate).getTime();
    if (Number.isNaN(eventTime) || eventTime < VAT_EFFECTIVE_DATE) return false;
    const ref = getOrderRef(order.id);
    const s = previewOrderSearch.toLowerCase();
    return (
      ref.toLowerCase().includes(s) ||
      order.customerName?.toLowerCase().includes(s)
    );
  });

  // Each invoice type maps to a (possibly future) backend endpoint that
  // returns a PDF blob. Disabled types are stubs — the backend endpoint
  // hasn't shipped yet.
  type InvoiceType = {
    key: string;
    label: string;
    description: string;
    endpoint: ((orderId: string) => string) | null;
    /**
     * When true this doc is rendered PER RESTAURANT — the preview endpoint
     * accepts a ?restaurantId= query param and returns one doc for that
     * restaurant. Multi-restaurant orders require the admin to pick which
     * one before the button becomes actionable.
     */
    perRestaurant?: boolean;
  };
  const invoiceTypes: InvoiceType[] = [
    {
      key: "customer-vat",
      label: "Customer VAT Invoice",
      description: "Per-supplier-block customer invoice with VAT breakdown",
      endpoint: (id) => `catering-orders/${id}/preview-vat-pdf`,
    },
    {
      key: "customer-receipt",
      label: "Customer Receipt",
      description: "Post-payment receipt (same layout as invoice, marked paid)",
      endpoint: (id) => `catering-orders/${id}/preview-vat-receipt-pdf`,
    },
    {
      key: "restaurant-payout",
      label: "Restaurant Payout Receipt",
      description: "Per-restaurant payout receipt (pick which restaurant above)",
      endpoint: (id) => `catering-orders/${id}/preview-payout-receipt-pdf`,
      perRestaurant: true,
    },
    {
      key: "commission-tax",
      label: "Monthly Commission Tax Invoice",
      description: "Swift's tax invoice for the supplier's commission (month of event)",
      endpoint: (id) => `catering-orders/${id}/preview-commission-pdf`,
      perRestaurant: true,
    },
    {
      key: "delivery-note",
      label: "Order Checklist",
      description: "Per-restaurant packing checklist — items, add-ons & cutlery, no prices",
      endpoint: (id) => `catering-orders/${id}/preview-delivery-note-pdf`,
      perRestaurant: true,
    },
  ];

  // Restaurants on the currently-picked order (Swift-owned lines at 100%
  // commission are filtered out — those don't have a payout receipt or a
  // commission tax invoice of their own).
  const previewSelectedOrder = orders.find((o) => o.id === previewOrderId);
  const previewOrderRestaurants: OrderRestaurant[] =
    (previewSelectedOrder?.restaurants || []).filter(
      (r) => (r.commissionRate ?? 0) < 100,
    );
  const previewNeedsRestaurantPicker = previewOrderRestaurants.length > 1;
  const previewSelectedRestaurant = previewOrderRestaurants.find(
    (r) => r.restaurantId === previewRestaurantId,
  );

  // When the picked order changes, reset / auto-populate the restaurant
  // selector. If there's exactly one restaurant on the order the picker
  // stays hidden and the id is pre-set so the buttons work immediately.
  useEffect(() => {
    if (previewOrderRestaurants.length === 1) {
      setPreviewRestaurantId(previewOrderRestaurants[0].restaurantId);
    } else if (
      previewRestaurantId &&
      !previewOrderRestaurants.some(
        (r) => r.restaurantId === previewRestaurantId,
      )
    ) {
      // Switched to a different order where the previously-picked
      // restaurant doesn't exist — clear so the admin picks again.
      setPreviewRestaurantId("");
    } else if (previewOrderRestaurants.length === 0) {
      setPreviewRestaurantId("");
    }
    // We deliberately only re-run when the order id changes; the picker
    // reset is tied to that transition, not to keystrokes on the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOrderId]);

  const handlePreviewInvoice = async (type: InvoiceType) => {
    if (!previewOrderId) {
      setPreviewError("Pick an order first");
      return;
    }
    if (!type.endpoint) return;
    if (type.perRestaurant && !previewRestaurantId) {
      setPreviewError(
        "Pick which restaurant you want the preview for — this order has more than one supplier.",
      );
      return;
    }
    setPreviewError(null);
    setPreviewLoadingType(type.key);
    try {
      const endpoint = type.perRestaurant && previewRestaurantId
        ? `${type.endpoint(previewOrderId)}?restaurantId=${encodeURIComponent(
            previewRestaurantId,
          )}`
        : type.endpoint(previewOrderId);
      const res = await http.get(endpoint, {
        responseType: "blob",
      });
      const blob = res.data as Blob;
      // Commission preview returns HTML; everything else is PDF.
      const blobType =
        type.key === "commission-tax" ? "text/html" : "application/pdf";
      const typedBlob = blob.type ? blob : new Blob([blob], { type: blobType });
      const objectUrl = URL.createObjectURL(typedBlob);
      window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    } catch (err: any) {
      // Blob error responses come back as Blob even when the server sent JSON.
      let message =
        err?.response?.data?.message || err?.message || "Failed to load preview";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed.message || text;
        } catch {
          /* swallow */
        }
      }
      setPreviewError(message);
    } finally {
      setPreviewLoadingType(null);
    }
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

      {/* Preview Invoice Types */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: 600,
          marginTop: 24,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "#334155" }}>
          Preview Invoice Types
        </h2>
        <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>
          Render any invoice/receipt PDF for a chosen catering order without
          sending email or creating a Stripe invoice. Useful for QA. Only
          orders with an event date on or after 1 April 2026 are listed —
          earlier orders are pre-VAT-registration and have no VAT invoice.
        </p>

        {/* Order picker */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
              color: "#475569",
            }}
          >
            Order
          </label>
          <input
            type="text"
            placeholder="Search by reference or customer name..."
            value={previewOrderSearch}
            onChange={(e) => setPreviewOrderSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 8,
            }}
          />
          <select
            value={previewOrderId}
            onChange={(e) => setPreviewOrderId(e.target.value)}
            size={Math.min(6, previewFilteredOrders.length + 1)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              outline: "none",
              background: "#fff",
            }}
          >
            <option value="">— Select an order —</option>
            {previewFilteredOrders.slice(0, 50).map((order) => (
              <option key={order.id} value={order.id}>
                {getOrderRef(order.id)} — {order.customerName}
                {order.eventDate
                  ? ` · ${new Date(order.eventDate).toLocaleDateString("en-GB")}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Restaurant picker — only appears when the picked order has
            more than one non-Swift restaurant. Single-restaurant orders
            skip this UI entirely so admins aren't clicking through
            unnecessary chrome. */}
        {previewNeedsRestaurantPicker && (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 6,
                color: "#475569",
              }}
            >
              Restaurant
            </label>
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>
              This order has {previewOrderRestaurants.length} restaurants.
              Pick which one to preview payout receipt / commission tax
              invoice / order checklist for.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {previewOrderRestaurants.map((r) => {
                const isSelected =
                  r.restaurantId === previewRestaurantId;
                return (
                  <button
                    key={r.restaurantId}
                    onClick={() => setPreviewRestaurantId(r.restaurantId)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: isSelected
                        ? "2px solid #2563eb"
                        : "1px solid #e2e8f0",
                      background: isSelected ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          border: isSelected
                            ? "5px solid #2563eb"
                            : "2px solid #cbd5e1",
                          boxSizing: "border-box",
                          background: "#fff",
                        }}
                      />
                      <span
                        style={{
                          color: isSelected ? "#1e40af" : "#1e293b",
                          fontWeight: isSelected ? 600 : 500,
                        }}
                      >
                        {r.restaurantName}
                      </span>
                    </div>
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      £{Number(r.customerTotal || 0).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {previewSelectedOrder &&
          previewOrderRestaurants.length === 1 && (
            <div
              style={{
                marginBottom: 16,
                fontSize: 12,
                color: "#64748b",
                fontStyle: "italic",
              }}
            >
              Single restaurant on this order:{" "}
              <span style={{ color: "#1e293b", fontWeight: 500 }}>
                {previewOrderRestaurants[0].restaurantName}
              </span>{" "}
              — per-restaurant previews will use this restaurant.
            </div>
          )}

        {/* Invoice-type buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {invoiceTypes.map((type) => {
            const needsRestaurant =
              !!type.perRestaurant && !previewRestaurantId;
            const isDisabled =
              !type.endpoint || !previewOrderId || needsRestaurant;
            const isLoading = previewLoadingType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => handlePreviewInvoice(type)}
                disabled={isDisabled || isLoading}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: isDisabled ? "#f8fafc" : "#fff",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: isDisabled ? "#94a3b8" : "#1e293b",
                      fontSize: 14,
                    }}
                  >
                    {type.label}
                    {type.perRestaurant && previewSelectedRestaurant && (
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          color: "#2563eb",
                          marginLeft: 8,
                        }}
                      >
                        · {previewSelectedRestaurant.restaurantName}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {needsRestaurant
                      ? "Pick a restaurant above to enable this preview."
                      : type.description}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: type.endpoint ? "#2563eb" : "#94a3b8",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isLoading ? "Loading..." : type.endpoint ? "Open PDF →" : "Coming soon"}
                </span>
              </button>
            );
          })}
        </div>

        {previewError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: 12,
              marginTop: 16,
              color: "#dc2626",
              fontSize: 14,
            }}
          >
            {previewError}
          </div>
        )}
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
