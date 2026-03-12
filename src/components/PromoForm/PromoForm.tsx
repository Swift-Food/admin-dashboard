import React, { useState } from "react";
import RestaurantMultiSelect from "../RestaurantMultiSelect";
import "./Promoform.css";

export default function PromoForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: any;
  onSubmit: (dto: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<any>({
    code: initialData?.code ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    restaurantIds: initialData?.restaurantIds ?? [],
    discountAmount: initialData?.discountAmount ?? "",
    discountType: initialData?.discountType ?? "PERCENT",
    currency: initialData?.currency ?? "GBP",
    maxDiscount: initialData?.maxDiscount ?? "",
    minOrderValue: initialData?.minOrderValue ?? "",
    maxUses: initialData?.maxUses ?? "",
    maxUsesPerUser: initialData?.maxUsesPerUser ?? "",
    isActive: initialData?.isActive ?? true,
    validFrom: initialData?.validFrom
      ? new Date(initialData.validFrom).toISOString().slice(0, 16)
      : "",
    expiresAt: initialData?.expiresAt
      ? new Date(initialData.expiresAt).toISOString().slice(0, 16)
      : "",
    appliesTo: initialData?.appliesTo ?? "BOTH",
    discountTarget: initialData?.discountTarget ?? "FOOD_SUBTOTAL",
    coworkingVenueIds: initialData?.coworkingVenueIds?.join(", ") ?? "",
  });

  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: any) =>
    setForm((s: any) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dto = {
        code: form.code,
        name: form.name || undefined,
        description: form.description || undefined,
        restaurantIds: Array.isArray(form.restaurantIds)
          ? form.restaurantIds
          : [],
        discountAmount: Number(form.discountAmount),
        discountType: form.discountType,
        currency: form.currency || undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        minOrderValue: form.minOrderValue
          ? Number(form.minOrderValue)
          : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        maxUsesPerUser: form.maxUsesPerUser
          ? Number(form.maxUsesPerUser)
          : undefined,
        isActive: !!form.isActive,
        validFrom: form.validFrom
          ? new Date(form.validFrom).toISOString()
          : undefined,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
        appliesTo: form.appliesTo,
        discountTarget: form.discountTarget,
        coworkingVenueIds:
          form.discountTarget === "VENUE_HIRE_FEE" && form.coworkingVenueIds
            ? form.coworkingVenueIds
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : undefined,
      };
      await onSubmit(dto);
    } finally {
      setSubmitting(false);
    }
  };

  const isPercent = form.discountType === "PERCENT";

  return (
    <form onSubmit={handleSubmit} className="pf">
      <div className="pf-scroll">
        {/* Code & Name */}
        <div className="pf-section">
          <div className="pf-row">
            <div className="pf-field pf-field-grow">
              <label className="pf-label">
                Code <span className="pf-req">*</span>
              </label>
              <input
                required
                disabled={!!initialData}
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                className="pf-input pf-input-code"
                placeholder="SUMMER2024"
              />
              {initialData && (
                <span className="pf-hint">Cannot change after creation</span>
              )}
            </div>
            <div className="pf-field pf-field-grow">
              <label className="pf-label">Display Name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="pf-input"
                placeholder="Summer Sale 2024"
              />
            </div>
          </div>
          <div className="pf-field">
            <label className="pf-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="pf-textarea"
              placeholder="Internal notes..."
              rows={2}
            />
          </div>
        </div>

        {/* Discount */}
        <div className="pf-section">
          <div className="pf-section-header">
            <span className="pf-section-title">Discount</span>
          </div>

          {/* Discount type selector */}
          <div className="pf-type-selector">
            <button
              type="button"
              className={`pf-type-btn ${isPercent ? "pf-type-active" : ""}`}
              onClick={() =>
                setForm((s: any) => ({
                  ...s,
                  discountType: "PERCENT",
                  discountAmount: "",
                }))
              }
            >
              Percentage (%)
            </button>
            <button
              type="button"
              className={`pf-type-btn ${!isPercent ? "pf-type-active" : ""}`}
              onClick={() =>
                setForm((s: any) => ({
                  ...s,
                  discountType: "FIXED",
                  discountAmount: "",
                }))
              }
            >
              Fixed Amount (£)
            </button>
          </div>

          {/* Amount input - prominent */}
          <div className="pf-amount-row">
            <div className="pf-amount-wrap">
              <span className="pf-amount-prefix">
                {isPercent ? "%" : "£"}
              </span>
              <input
                required
                type="number"
                step={isPercent ? "1" : "0.01"}
                min="0"
                max={isPercent ? 100 : undefined}
                value={form.discountAmount}
                onChange={(e) => set("discountAmount", e.target.value)}
                className="pf-amount-input"
                placeholder="0"
              />
            </div>
            {isPercent && form.discountAmount && (
              <span className="pf-amount-hint">
                {form.discountAmount}% off
                {form.maxDiscount
                  ? `, max £${Number(form.maxDiscount).toFixed(2)}`
                  : ""}
              </span>
            )}
          </div>

          {/* Target + Applies To */}
          <div className="pf-row">
            <div className="pf-field pf-field-grow">
              <label className="pf-label">What does it discount?</label>
              <div className="pf-target-selector">
                <button
                  type="button"
                  className={`pf-target-btn ${form.discountTarget === "FOOD_SUBTOTAL" ? "pf-target-food-active" : ""}`}
                  onClick={() => set("discountTarget", "FOOD_SUBTOTAL")}
                >
                  <span className="pf-target-icon">🍽</span>
                  Food Subtotal
                </button>
                <button
                  type="button"
                  className={`pf-target-btn ${form.discountTarget === "VENUE_HIRE_FEE" ? "pf-target-venue-active" : ""}`}
                  onClick={() => set("discountTarget", "VENUE_HIRE_FEE")}
                >
                  <span className="pf-target-icon">🏢</span>
                  Venue Hire Fee
                </button>
              </div>
            </div>
            <div className="pf-field">
              <label className="pf-label">Who can use it?</label>
              <select
                value={form.appliesTo}
                onChange={(e) => set("appliesTo", e.target.value)}
                className="pf-select"
              >
                <option value="BOTH">Everyone</option>
                <option value="CATERING">Catering Only</option>
                <option value="CONSUMER">Consumer Only</option>
              </select>
            </div>
          </div>

          {form.discountTarget === "VENUE_HIRE_FEE" && (
            <div className="pf-field">
              <label className="pf-label">
                Restrict to Coworking Venues{" "}
                <span className="pf-optional">optional</span>
              </label>
              <input
                value={form.coworkingVenueIds}
                onChange={(e) => set("coworkingVenueIds", e.target.value)}
                className="pf-input"
                placeholder="Comma-separated venue IDs, or leave blank for all"
              />
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="pf-section">
          <div className="pf-section-header">
            <span className="pf-section-title">Limits</span>
            <span className="pf-section-subtitle">All optional</span>
          </div>
          <div className="pf-row pf-row-3">
            <div className="pf-field">
              <label className="pf-label">Min Order</label>
              <div className="pf-input-prefix-wrap">
                <span className="pf-input-prefix">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minOrderValue}
                  onChange={(e) => set("minOrderValue", e.target.value)}
                  className="pf-input pf-input-prefixed"
                  placeholder="None"
                />
              </div>
            </div>
            {isPercent && (
              <div className="pf-field">
                <label className="pf-label">Max Discount</label>
                <div className="pf-input-prefix-wrap">
                  <span className="pf-input-prefix">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.maxDiscount}
                    onChange={(e) => set("maxDiscount", e.target.value)}
                    className="pf-input pf-input-prefixed"
                    placeholder="None"
                  />
                </div>
              </div>
            )}
            <div className="pf-field">
              <label className="pf-label">Max Uses</label>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => set("maxUses", e.target.value)}
                className="pf-input"
                placeholder="Unlimited"
              />
            </div>
            <div className="pf-field">
              <label className="pf-label">Per User</label>
              <input
                type="number"
                min="1"
                value={form.maxUsesPerUser}
                onChange={(e) => set("maxUsesPerUser", e.target.value)}
                className="pf-input"
                placeholder="Unlimited"
              />
            </div>
          </div>
        </div>

        {/* Restaurants */}
        <div className="pf-section">
          <div className="pf-section-header">
            <span className="pf-section-title">Restaurants</span>
            <span className="pf-section-subtitle">
              Leave empty for all restaurants
            </span>
          </div>
          <RestaurantMultiSelect
            selectedIds={form.restaurantIds}
            onChange={(ids) => set("restaurantIds", ids)}
          />
        </div>

        {/* Schedule */}
        <div className="pf-section">
          <div className="pf-section-header">
            <span className="pf-section-title">Schedule</span>
            <span className="pf-section-subtitle">
              Leave blank for no time restrictions
            </span>
          </div>
          <div className="pf-row">
            <div className="pf-field pf-field-grow">
              <label className="pf-label">Starts</label>
              <input
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) => set("validFrom", e.target.value)}
                className="pf-input"
              />
            </div>
            <div className="pf-field pf-field-grow">
              <label className="pf-label">Expires</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
                className="pf-input"
              />
            </div>
          </div>

          <div className="pf-toggle-row">
            <label className="pf-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="pf-toggle-input"
              />
              <span className="pf-toggle-track">
                <span className="pf-toggle-thumb" />
              </span>
              <span className="pf-toggle-label">
                {form.isActive ? "Active" : "Inactive"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pf-actions">
        <button
          type="button"
          className="pf-btn pf-btn-cancel"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="pf-btn pf-btn-submit"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="pf-spinner" />
              Saving...
            </>
          ) : initialData ? (
            "Save Changes"
          ) : (
            "Create Promo Code"
          )}
        </button>
      </div>
    </form>
  );
}
