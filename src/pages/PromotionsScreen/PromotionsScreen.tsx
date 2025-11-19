import  { useEffect, useState } from "react";
import promotionsService from "../../services/promo-code.service";
import type { PromoCodeDto } from "../../services/promo-code.service";
import PromoForm from "../../components/PromoForm";
import "./PromotionsScreen.css";

export default function PromotionsScreen() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const data = await promotionsService.getPromoCodes();
      setPromos(data);
      setError(null);
    } catch (e: any) {
      console.error("Failed to load promos:", e);
      setError(e?.message || "Failed to load promos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (p: any) => {
    setEditing(p);
    setShowForm(true);
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete promo ${code}? This cannot be undone.`)) return;
    try {
      await promotionsService.deletePromoCode(code);
      alert("Deleted successfully");
      fetchAll();
    } catch (e: any) {
      console.error("Delete failed:", e);
      alert("Failed to delete: " + (e?.message || ""));
    }
  };

  const handleSubmit = async (dto: PromoCodeDto) => {
    try {
      if (editing) {
        await promotionsService.updatePromoCode(editing.code, dto);
        alert("Updated successfully");
      } else {
        await promotionsService.createPromoCode(dto);
        alert("Created successfully");
      }
      setShowForm(false);
      fetchAll();
    } catch (e: any) {
      console.error("Save failed:", e);
      alert(
        "Failed to save: " + (e?.response?.data?.message || e?.message || "")
      );
    }
  };

  const getAppliesBadgeClass = (appliesTo: string) => {
    if (appliesTo === "CATERING") return "applies-badge applies-badge-catering";
    if (appliesTo === "CONSUMER") return "applies-badge applies-badge-consumer";
    return "applies-badge";
  };

  const getDiscountColor = (discountAmount: number, discountType: string) => {
    let normalizedValue = discountAmount;

    if (discountType === "FIXED") {
      normalizedValue = Math.min((discountAmount / 50) * 100, 100);
    }

    normalizedValue = Math.max(0, Math.min(100, normalizedValue));

    // Pastel gradient: soft pink -> soft peach -> soft mint
    let r, g, b;

    if (normalizedValue < 50) {
      // Soft pink to peach
      r = Math.round(255 - (normalizedValue / 50) * 30);
      g = Math.round(220 + (normalizedValue / 50) * 15);
      b = Math.round(230 - (normalizedValue / 50) * 50);
    } else {
      // Peach to mint green
      r = Math.round(225 - ((normalizedValue - 50) / 50) * 50);
      g = Math.round(235 - ((normalizedValue - 50) / 50) * 20);
      b = Math.round(180 + ((normalizedValue - 50) / 50) * 45);
    }

    return `rgb(${r}, ${g}, ${b})`;
  };

  const getDiscountTextColor = (
    discountAmount: number,
    discountType: string
  ) => {
    let normalizedValue = discountAmount;

    if (discountType === "FIXED") {
      normalizedValue = Math.min((discountAmount / 50) * 100, 100);
    }

    normalizedValue = Math.max(0, Math.min(100, normalizedValue));

    // Softer, less harsh text colors
    if (normalizedValue < 50) {
      return "#b85c7a"; // Muted rose
    } else if (normalizedValue < 75) {
      return "#c67d5a"; // Muted coral
    } else {
      return "#5a9c7a"; // Muted teal
    }
  };

  return (
    <div className="promotions-container">
      <div className="promotions-content">
        <div className="promotions-header">
          <div>
            <h1 className="promotions-title">Promo Codes</h1>
          </div>
          <div className="header-actions">
            <button onClick={fetchAll} className="btn btn-secondary">
              Refresh
            </button>
            <button onClick={handleCreate} className="btn btn-primary">
              Create any
            </button>
          </div>
        </div>

        {error && (
          <div className="error-alert">
            <p className="error-text">Error: {error}</p>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-content">
              <div className="spinner"></div>
              <p className="loading-text">Loading promo codes...</p>
            </div>
          </div>
        ) : promos.length === 0 ? (
          <div className="table-container">
            <div className="empty-state">
              <div className="empty-icon">🎟️</div>
              <h3 className="empty-title">No promo codes yet</h3>
              <p className="empty-text">
                Create your first promo code to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table className="promos-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Discount</th>
                    <th>Applies To</th>
                    <th>Status</th>
                    <th>Uses</th>
                    <th>Valid Period</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p: any) => (
                    <tr key={p.code} className="promo-row">
                      <td className="code-cell">{p.code}</td>
                      <td>{p.name || "—"}</td>
                      <td>
                        <span
                          className="discount-badge"
                          style={{
                            backgroundColor: getDiscountColor(
                              p.discountAmount,
                              p.discountType
                            ),
                            color: getDiscountTextColor(
                              p.discountAmount,
                              p.discountType
                            ),
                          }}
                        >
                          {p.discountType === "PERCENT"
                            ? `${p.discountAmount}%`
                            : `£${p.discountAmount}`}
                        </span>
                      </td>
                      <td>
                        <span className={getAppliesBadgeClass(p.appliesTo)}>
                          {p.appliesTo}
                        </span>
                      </td>
                      <td>
                        <div className="status-indicator">
                          <span
                            className={`status-dot ${
                              p.isActive
                                ? "status-dot-active"
                                : "status-dot-inactive"
                            }`}
                          ></span>
                          <span
                            className={`status-text ${
                              p.isActive
                                ? "status-text-active"
                                : "status-text-inactive"
                            }`}
                          >
                            {p.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="uses-count">{p.usesCount ?? 0}</span>
                        {p.maxUses && (
                          <span style={{ color: "#6b7280" }}>
                            {" "}
                            / {p.maxUses}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="date-range">
                          <div>
                            {p.validFrom
                              ? new Date(p.validFrom).toLocaleDateString()
                              : "—"}
                          </div>
                          <div>
                            →{" "}
                            {p.expiresAt
                              ? new Date(p.expiresAt).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(p)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.code)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">
                  {editing ? `Edit ${editing.code}` : "Create any Code"}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="close-button"
                >
                  ✕
                </button>
              </div>
              <PromoForm
                initialData={editing}
                onCancel={() => setShowForm(false)}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
