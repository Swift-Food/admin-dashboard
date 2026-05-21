import React, { useState } from "react";
import http from "../services/http";

const CacheHandlingScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleClearCache = async () => {
    if (!window.confirm("Are you sure you want to clear the cache?")) return;
    setLoading(true);
    setMessage(null);
    try {
      await http.delete("/cache-test/reset");
      setMessage({ type: "success", text: "Cache cleared successfully." });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to clear cache.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#051661", marginBottom: 16 }}>
        Cache Handling
      </h1>
      <button
        onClick={handleClearCache}
        disabled={loading}
        style={{
          padding: "10px 18px",
          background: loading ? "#9ca3af" : "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: "0.9rem",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Clearing…" : "Clear Cache"}
      </button>
      {message && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background: message.type === "success" ? "#dcfce7" : "#fee2e2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            fontSize: "0.9rem",
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};

export default CacheHandlingScreen;
