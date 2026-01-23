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
    discountAmount: initialData?.discountAmount ?? 0,
    discountType: initialData?.discountType ?? "PERCENT",
    currency: initialData?.currency ?? "GBP",
    maxDiscount: initialData?.maxDiscount ?? undefined,
    minOrderValue: initialData?.minOrderValue ?? undefined,
    maxUses: initialData?.maxUses ?? undefined,
    maxUsesPerUser: initialData?.maxUsesPerUser ?? undefined,
    isActive: initialData?.isActive ?? true,
    validFrom: initialData?.validFrom
      ? new Date(initialData.validFrom).toISOString().slice(0, 16)
      : "",
    expiresAt: initialData?.expiresAt
      ? new Date(initialData.expiresAt).toISOString().slice(0, 16)
      : "",
    appliesTo: initialData?.appliesTo ?? "BOTH",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (k: string, v: any) =>
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
      };
      await onSubmit(dto);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="promo-form">
      <div className="promo-form-scroll">
        {/* Basic Info Section */}
        <section className="form-section">
          <h4 className="section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-field">
              <label className="field-label required">Promo Code</label>
              <input
                required
                disabled={!!initialData}
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                className="field-input"
                placeholder="e.g., SUMMER2024"
              />
              {initialData && (
                <span className="field-hint">Code cannot be changed after creation</span>
              )}
            </div>
            <div className="form-field">
              <label className="field-label">Display Name</label>
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="field-input"
                placeholder="e.g., Summer Sale 2024"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="field-textarea"
              placeholder="Internal notes about this promo code..."
              rows={2}
            />
          </div>
        </section>

        {/* Discount Section */}
        <section className="form-section">
          <h4 className="section-title">Discount Settings</h4>
          <div className="form-row form-row-3">
            <div className="form-field">
              <label className="field-label required">Amount</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.discountAmount}
                onChange={(e) => handleChange("discountAmount", e.target.value)}
                className="field-input"
                placeholder="10"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Type</label>
              <select
                value={form.discountType}
                onChange={(e) => handleChange("discountType", e.target.value)}
                className="field-select"
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (£)</option>
              </select>
            </div>
            <div className="form-field">
              <label className="field-label">Applies To</label>
              <select
                value={form.appliesTo}
                onChange={(e) => handleChange("appliesTo", e.target.value)}
                className="field-select"
              >
                <option value="BOTH">Both</option>
                <option value="CATERING">Catering Only</option>
                <option value="CONSUMER">Consumer Only</option>
              </select>
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-field">
              <label className="field-label">Min Order (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minOrderValue ?? ""}
                onChange={(e) => handleChange("minOrderValue", e.target.value)}
                className="field-input"
                placeholder="No minimum"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Max Discount (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.maxDiscount ?? ""}
                onChange={(e) => handleChange("maxDiscount", e.target.value)}
                className="field-input"
                placeholder="No limit"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Max Uses Per User</label>
              <input
                type="number"
                min="1"
                value={form.maxUsesPerUser ?? ""}
                onChange={(e) => handleChange("maxUsesPerUser", e.target.value)}
                className="field-input"
                placeholder="Unlimited"
              />
            </div>
          </div>
        </section>

        {/* Restaurant Applicability */}
        <section className="form-section">
          <h4 className="section-title">Restaurant Applicability</h4>
          <RestaurantMultiSelect
            selectedIds={form.restaurantIds}
            onChange={(ids) => handleChange("restaurantIds", ids)}
          />
        </section>

        {/* Validity Section */}
        <section className="form-section">
          <h4 className="section-title">Validity Period</h4>
          <div className="form-row form-row-3">
            <div className="form-field">
              <label className="field-label">Valid From</label>
              <input
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) => handleChange("validFrom", e.target.value)}
                className="field-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Expires At</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => handleChange("expiresAt", e.target.value)}
                className="field-input"
              />
            </div>
            <div className="form-field">
              <label className="field-label">Max Total Uses</label>
              <input
                type="number"
                min="1"
                value={form.maxUses ?? ""}
                onChange={(e) => handleChange("maxUses", e.target.value)}
                className="field-input"
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="form-field-inline">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="toggle-input"
              />
              <span className="toggle-switch"></span>
              <span className="toggle-text">
                {form.isActive ? "Active" : "Inactive"} — {form.isActive ? "Promo code can be used" : "Promo code is disabled"}
              </span>
            </label>
          </div>
        </section>
      </div>

      {/* Form Actions - Fixed at bottom */}
      <div className="promo-form-actions">
        <button type="button" className="btn btn-cancel" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner-small"></span>
              Saving...
            </>
          ) : initialData ? (
            "Update Promo Code"
          ) : (
            "Create Promo Code"
          )}
        </button>
      </div>
    </form>
  );
}
