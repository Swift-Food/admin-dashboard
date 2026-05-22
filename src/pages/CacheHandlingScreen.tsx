import React, { useState } from "react";
import http from "../services/http";

const CacheHandlingScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleClearCache = async () => {
    if (
      !window.confirm(
        "Wipe ALL catering chat sessions from Redis? Active users will lose their session and have to start over.",
      )
    )
      return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await http.delete<{ deletedCount: number }>(
        "/admin/chatbot-sessions/cache",
      );
      const count = res.data?.deletedCount ?? 0;
      setMessage({
        type: "success",
        text: `Cleared ${count} chat session${count === 1 ? "" : "s"}.`,
      });
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
      <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: 16, maxWidth: 560 }}>
        Wipes every catering-chat session from Redis (keys matching{" "}
        <code>catering-chat:session:*</code>). Other caches — restaurant
        availability, partner spaces, etc. — are not touched.
      </p>
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
        {loading ? "Clearing…" : "Clear chat sessions"}
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
