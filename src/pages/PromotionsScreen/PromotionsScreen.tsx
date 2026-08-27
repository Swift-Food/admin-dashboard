import { useEffect, useState, useMemo } from "react";
import promotionsService from "../../services/promo-code.service";
import type { PromoCodeDto } from "../../services/promo-code.service";
import { getAllRestaurants } from "../../services/restaurant.service";
import PromoForm from "../../components/PromoForm";
import "./PromotionsScreen.css";

type FilterStatus = "all" | "active" | "inactive" | "expired";
type FilterTarget = "all" | "FOOD_SUBTOTAL" | "VENUE_HIRE_FEE";
// Personal codes belong to one customer's email (whether created manually or
// generated as a reward) and are single-use; campaign codes are shared.
type FilterAssignment = "all" | "personal" | "campaign";

const kindOf = (p: any): "MANUAL" | "COMPLETION_REWARD" =>
  p.kind === "COMPLETION_REWARD" ? "COMPLETION_REWARD" : "MANUAL";

const isPersonal = (p: any): boolean => !!p.assignedEmail;

export default function PromotionsScreen() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [restaurantMap, setRestaurantMap] = useState<Record<string, string>>(
    {}
  );
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterTarget, setFilterTarget] = useState<FilterTarget>("all");
  const [filterAssignment, setFilterAssignment] = useState<FilterAssignment>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [promoData, restaurantData] = await Promise.all([
        promotionsService.getPromoCodes(),
        getAllRestaurants(),
      ]);
      setPromos(promoData);
      const rMap: Record<string, string> = {};
      restaurantData.forEach((r: any) => {
        rMap[r.id] = r.restaurant_name;
      });
      setRestaurantMap(rMap);
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

  const getPromoStatus = (p: any): "active" | "inactive" | "expired" | "limit-reached" => {
    if (!p.isActive) return "inactive";
    if (p.expiresAt && new Date(p.expiresAt) < new Date()) return "expired";
    if (p.maxUses && (p.usesCount ?? 0) >= p.maxUses) return "limit-reached";
    return "active";
  };

  const filtered = useMemo(() => {
    return promos.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchCode = p.code?.toLowerCase().includes(q);
        const matchName = p.name?.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      if (filterTarget !== "all" && p.discountTarget !== filterTarget)
        return false;
      if (filterAssignment === "personal" && !isPersonal(p)) return false;
      if (filterAssignment === "campaign" && isPersonal(p)) return false;
      if (filterStatus !== "all") {
        const status = getPromoStatus(p);
        if (filterStatus === "active" && status !== "active") return false;
        if (filterStatus === "inactive" && status !== "inactive") return false;
        if (
          filterStatus === "expired" &&
          status !== "expired" &&
          status !== "limit-reached"
        )
          return false;
      }
      return true;
    });
  }, [promos, search, filterStatus, filterTarget, filterAssignment]);

  const stats = useMemo(() => {
    const active = promos.filter((p) => getPromoStatus(p) === "active").length;
    const food = promos.filter(
      (p) => p.discountTarget !== "VENUE_HIRE_FEE"
    ).length;
    const venue = promos.filter(
      (p) => p.discountTarget === "VENUE_HIRE_FEE"
    ).length;
    const personal = promos.filter((p) => isPersonal(p)).length;
    const personalUnused = promos.filter(
      (p) => isPersonal(p) && getPromoStatus(p) === "active"
    ).length;
    return { total: promos.length, active, food, venue, personal, personalUnused };
  }, [promos]);

  const handleDelete = async (code: string) => {
    try {
      await promotionsService.deletePromoCode(code);
      showToast(`Promo code "${code}" deleted`, "success");
      setDeleteConfirm(null);
      fetchAll();
    } catch (e: any) {
      showToast(
        "Failed to delete: " + (e?.message || "Unknown error"),
        "error"
      );
      setDeleteConfirm(null);
    }
  };

  const handleSubmit = async (dto: PromoCodeDto) => {
    try {
      if (editing) {
        await promotionsService.updatePromoCode(editing.code, dto);
        showToast(`Promo code "${editing.code}" updated`, "success");
      } else {
        await promotionsService.createPromoCode(dto);
        showToast(`Promo code "${dto.code}" created`, "success");
      }
      setShowForm(false);
      fetchAll();
    } catch (e: any) {
      showToast(
        "Failed to save: " +
          (e?.response?.data?.message || e?.message || "Unknown error"),
        "error"
      );
    }
  };

  const formatDiscount = (p: any) => {
    if (p.discountType === "PERCENT") return `${p.discountAmount}%`;
    return `£${Number(p.discountAmount).toFixed(2)}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="promos-page">
      {/* Toast */}
      {toast ? <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span>
          {toast.message}
        </div> : null}

      {/* Delete Confirmation */}
      {deleteConfirm ? <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div
            className="delete-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete Promo Code</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm}</strong>?
              This cannot be undone.
            </p>
            <div className="delete-dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div> : null}

      {/* Header */}
      <div className="promos-header">
        <div>
          <h1 className="promos-title">Promo Codes</h1>
          <p className="promos-subtitle">
            Manage discount codes for catering and venue hire
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + New Promo Code
        </button>
      </div>

      {/* Stats */}
      {!loading && promos.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card stat-active">
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card stat-food">
            <span className="stat-value">{stats.food}</span>
            <span className="stat-label">Food</span>
          </div>
          <div className="stat-card stat-venue">
            <span className="stat-value">{stats.venue}</span>
            <span className="stat-label">Venue Hire</span>
          </div>
          <div className="stat-card stat-reward">
            <span className="stat-value">{stats.personal}</span>
            <span className="stat-label">
              Personal codes{stats.personal ? ` (${stats.personalUnused} unused)` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && promos.length > 0 && (
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <div className="filter-pills">
            {(["all", "active", "inactive", "expired"] as FilterStatus[]).map(
              (s) => (
                <button
                  key={s}
                  className={`filter-pill ${filterStatus === s ? "filter-pill-active" : ""}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              )
            )}
            <span className="filter-divider" />
            {(["all", "campaign", "personal"] as FilterAssignment[]).map((a) => (
              <button
                key={a}
                className={`filter-pill ${filterAssignment === a ? "filter-pill-active" : ""}`}
                onClick={() => setFilterAssignment(a)}
              >
                {a === "all"
                  ? "All codes"
                  : a === "campaign"
                    ? "Campaign codes"
                    : "Personal codes"}
              </button>
            ))}
            <span className="filter-divider" />
            {(["all", "FOOD_SUBTOTAL", "VENUE_HIRE_FEE"] as FilterTarget[]).map(
              (t) => (
                <button
                  key={t}
                  className={`filter-pill ${filterTarget === t ? "filter-pill-active" : ""}`}
                  onClick={() => setFilterTarget(t)}
                >
                  {t === "all"
                    ? "All Targets"
                    : t === "FOOD_SUBTOTAL"
                      ? "Food"
                      : "Venue Hire"}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {error ? <div className="error-alert">
          <p className="error-text">Error: {error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
            Retry
          </button>
        </div> : null}

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Loading promo codes...</p>
        </div>
      ) : promos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎟️</div>
          <h3 className="empty-title">No promo codes yet</h3>
          <p className="empty-text">
            Create your first promo code to get started
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Create Promo Code
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p className="empty-text">No promo codes match your filters</p>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "0.75rem" }}
            onClick={() => {
              setSearch("");
              setFilterStatus("all");
              setFilterTarget("all");
              setFilterAssignment("all");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="promo-grid">
          {filtered.map((p: any) => {
            const status = getPromoStatus(p);
            return (
              <div
                key={p.code}
                className={`promo-card ${status === "inactive" || status === "expired" || status === "limit-reached" ? "promo-card-dimmed" : ""}`}
              >
                <div className="card-top">
                  <div className="card-top-left">
                    <span className="card-code">{p.code}</span>
                    {p.name ? <span className="card-name">{p.name}</span> : null}
                  </div>
                  <span className={`status-badge status-${status}`}>
                    {status === "limit-reached" ? "Limit Reached" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>

                <div className="card-discount-row">
                  <span className="card-discount">{formatDiscount(p)}</span>
                  <span className="card-discount-label">
                    {p.discountType === "PERCENT" ? "off" : "fixed"} ·{" "}
                  </span>
                  <span
                    className={`target-pill ${p.discountTarget === "VENUE_HIRE_FEE" ? "target-venue" : "target-food"}`}
                  >
                    {p.discountTarget === "VENUE_HIRE_FEE"
                      ? "Venue Hire"
                      : "Food Subtotal"}
                  </span>
                  {p.assignedEmail ? (
                    <span className="target-pill target-reward" title={p.assignedEmail}>
                      {kindOf(p) === "COMPLETION_REWARD" ? "Reward" : "Personal"} · {p.assignedEmail}
                    </span>
                  ) : null}
                </div>

                <div className="card-details">
                  <div className="card-detail">
                    <span className="detail-label">Applies To</span>
                    <span className="detail-value">
                      {p.appliesTo === "BOTH"
                        ? "Catering & Consumer"
                        : p.appliesTo === "CATERING"
                          ? "Catering"
                          : "Consumer"}
                    </span>
                  </div>
                  <div className="card-detail">
                    <span className="detail-label">Usage</span>
                    <span className="detail-value">
                      {p.usesCount ?? 0}
                      {p.maxUses ? ` / ${p.maxUses}` : ""}
                      {p.maxUsesPerUser
                        ? ` (${p.maxUsesPerUser}/user)`
                        : ""}
                    </span>
                  </div>
                  {p.restaurantIds && p.restaurantIds.length > 0 ? <div className="card-detail">
                      <span className="detail-label">Restaurants</span>
                      <span
                        className="detail-value"
                        title={p.restaurantIds
                          .map((id: string) => restaurantMap[id] || id)
                          .join(", ")}
                      >
                        {p.restaurantIds.length <= 2
                          ? p.restaurantIds
                              .map(
                                (id: string) =>
                                  restaurantMap[id] || "Unknown"
                              )
                              .join(", ")
                          : `${p.restaurantIds.length} restaurants`}
                      </span>
                    </div> : null}
                  {(p.minOrderValue || p.maxDiscount) ? <div className="card-detail">
                      <span className="detail-label">Limits</span>
                      <span className="detail-value">
                        {p.minOrderValue
                          ? `Min £${Number(p.minOrderValue).toFixed(2)}`
                          : ""}
                        {p.minOrderValue && p.maxDiscount ? " · " : ""}
                        {p.maxDiscount
                          ? `Max £${Number(p.maxDiscount).toFixed(2)}`
                          : ""}
                      </span>
                    </div> : null}
                  {(p.validFrom || p.expiresAt) ? <div className="card-detail">
                      <span className="detail-label">Period</span>
                      <span className="detail-value">
                        {formatDate(p.validFrom) || "—"} →{" "}
                        {formatDate(p.expiresAt) || "—"}
                      </span>
                    </div> : null}
                </div>

                <div className="card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditing(p);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => setDeleteConfirm(p.code)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm ? <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editing ? `Edit: ${editing.code}` : "New Promo Code"}
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
        </div> : null}
    </div>
  );
}
