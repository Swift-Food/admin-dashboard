import React, { useState } from "react";

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
    restaurantIds: initialData?.restaurantIds?.join(",") ?? "",
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

  const handleChange = (k: string, v: any) =>
    setForm((s: any) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto = {
      code: form.code,
      name: form.name || undefined,
      description: form.description || undefined,
      restaurantIds: form.restaurantIds
        ? form.restaurantIds.split(/[,\s]+/).filter(Boolean)
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
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label form-label-required">Code</label>
            <input
              required
              disabled={!!initialData}
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value)}
              className="form-input"
              placeholder="e.g., SUMMER2024"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Applies To</label>
            <select
              value={form.appliesTo}
              onChange={(e) => handleChange("appliesTo", e.target.value)}
              className="form-select"
            >
              <option value="BOTH">Both (Consumer & Catering)</option>
              <option value="CATERING">Catering Only</option>
              <option value="CONSUMER">Consumer Only</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="form-input"
            placeholder="e.g., Summer Sale 2024"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="form-textarea"
            placeholder="Internal description of this promo code..."
          />
        </div>

        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label form-label-required">
              Discount Amount
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.discountAmount}
              onChange={(e) => handleChange("discountAmount", e.target.value)}
              className="form-input"
              placeholder="e.g., 10"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Discount Type</label>
            <select
              value={form.discountType}
              onChange={(e) => handleChange("discountType", e.target.value)}
              className="form-select"
            >
              <option value="PERCENT">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (£)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Restaurant IDs (comma or space separated)
          </label>
          <input
            value={form.restaurantIds}
            onChange={(e) => handleChange("restaurantIds", e.target.value)}
            className="form-input"
            placeholder="e.g., rest_123, rest_456 (leave empty for all)"
          />
        </div>

        <div className="form-grid form-grid-3">
          <div className="form-group">
            <label className="form-label">Min Order Value (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderValue ?? ""}
              onChange={(e) => handleChange("minOrderValue", e.target.value)}
              className="form-input"
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Discount (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.maxDiscount ?? ""}
              onChange={(e) => handleChange("maxDiscount", e.target.value)}
              className="form-input"
              placeholder="No limit"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Total Uses</label>
            <input
              type="number"
              min="1"
              value={form.maxUses ?? ""}
              onChange={(e) => handleChange("maxUses", e.target.value)}
              className="form-input"
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Max Uses Per User</label>
          <input
            type="number"
            min="1"
            value={form.maxUsesPerUser ?? ""}
            onChange={(e) => handleChange("maxUsesPerUser", e.target.value)}
            className="form-input"
            placeholder="Unlimited"
          />
        </div>

        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Valid From</label>
            <input
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => handleChange("validFrom", e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Expires At</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => handleChange("expiresAt", e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-checkbox-group">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
            className="form-checkbox"
          />
          <label
            htmlFor="isActive"
            className="form-label"
            style={{ margin: 0 }}
          >
            Active (promo code can be used)
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initialData ? "Update Promo Code" : "Create Promo Code"}
        </button>
      </div>
    </form>
  );
}
