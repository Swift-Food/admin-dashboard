import React, { useState } from "react";
import http from "../services/http";

const MiscellaneousScreen: React.FC = () => {
  const [orderRefs, setOrderRefs] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadReceipts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (orderRefs.trim()) {
        params.append("refs", orderRefs.trim());
      }
      if (restaurantId.trim()) {
        params.append("restaurantId", restaurantId.trim());
      }

      const response = await http.get(`catering-orders/admin/export-receipts?${params.toString()}`, {
        responseType: "blob",
      });

      // Create download link
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

      {/* Download Receipts Section */}
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
          Export catering order receipt data to xlsx. You can filter by specific order references
          or restaurant ID.
        </p>

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
            Order References (comma-separated)
          </label>
          <input
            type="text"
            value={orderRefs}
            onChange={(e) => setOrderRefs(e.target.value)}
            placeholder="e.g., 3A46, 47D5, FC1B"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              outline: "none",
            }}
          />
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            Leave empty to export last 100 orders
          </p>
        </div>

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
            Restaurant ID (optional)
          </label>
          <input
            type="text"
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            placeholder="e.g., 7390b43d-e430-4fda-b87b-a5f393985be7"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              outline: "none",
            }}
          />
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
          disabled={loading}
          style={{
            background: loading ? "#94a3b8" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
