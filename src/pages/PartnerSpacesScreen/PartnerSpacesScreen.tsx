import { useEffect, useState } from "react";
import { Plus, X, Copy, Check, RefreshCw } from "lucide-react";
import partnerSpacesService from "../../services/partner-spaces.service";
import type {
  PartnerSpace,
  CreatePartnerSpaceDto,
  UpdatePartnerSpaceDto,
} from "../../types/partner-spaces.types";
import "./PartnerSpacesScreen.css";

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const parseApiErrors = (
  err: unknown
): { fieldErrors: Record<string, string>; general: string | null } => {
  const anyErr = err as any;
  const raw = anyErr?.response?.data?.message;
  const messages: string[] = Array.isArray(raw)
    ? raw
    : [raw || anyErr?.message || "An error occurred"];

  const fieldErrors: Record<string, string> = {};
  let general: string | null = null;

  for (const msg of messages) {
    if (typeof msg !== "string") continue;
    const lower = msg.toLowerCase();
    if (lower.includes("slug")) fieldErrors.slug = msg;
    else if (lower.includes("email")) fieldErrors.contactEmail = msg;
    else if (lower.includes("webhook")) fieldErrors.webhookUrl = msg;
    else if (lower.includes("name")) fieldErrors.name = msg;
    else general = msg;
  }

  if (Object.keys(fieldErrors).length === 0 && !general) {
    general = messages[0] ?? "An error occurred";
  }

  return { fieldErrors, general };
};

const emptyCreate: CreatePartnerSpaceDto = {
  name: "",
  slug: "",
  contactEmail: "",
  webhookUrl: "",
};


const PartnerSpacesScreen = () => {
  const [spaces, setSpaces] = useState<PartnerSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePartnerSpaceDto>({ ...emptyCreate });
  const [submitting, setSubmitting] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [createGeneralError, setCreateGeneralError] = useState<string | null>(null);

  // Detail/Edit modal — used in Tasks 7 & 8
  const [selectedSpace, setSelectedSpace] = useState<PartnerSpace | null>(null);
  const [editForm, setEditForm] = useState<
    UpdatePartnerSpaceDto & { name: string; slug: string; contactEmail: string; webhookUrl: string }
  >({
    name: "",
    slug: "",
    contactEmail: "",
    webhookUrl: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editGeneralError, setEditGeneralError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotating, setRotating] = useState(false);

  const handleCopyKey = async () => {
    if (!selectedSpace) return;
    try {
      await navigator.clipboard.writeText(selectedSpace.publishableKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      setEditGeneralError("Could not copy to clipboard. Please copy the key manually.");
    }
  };

  const handleSave = async () => {
    if (!selectedSpace) return;
    setEditFieldErrors({});
    setEditGeneralError(null);

    const dto: UpdatePartnerSpaceDto = {
      name: editForm.name.trim(),
      slug: editForm.slug.trim(),
      contactEmail: editForm.contactEmail.trim(),
      webhookUrl: editForm.webhookUrl?.trim() || undefined,
      isActive: editForm.isActive,
    };

    try {
      setSaving(true);
      const updated = await partnerSpacesService.update(selectedSpace.id, dto);
      setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedSpace(updated);
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setEditFieldErrors(fieldErrors);
      setEditGeneralError(general);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const openDetail = (space: PartnerSpace) => {
    setSelectedSpace(space);
    setEditForm({
      name: space.name,
      slug: space.slug,
      contactEmail: space.contactEmail,
      webhookUrl: space.webhookUrl ?? "",
      isActive: space.isActive,
    });
    setEditFieldErrors({});
    setEditGeneralError(null);
    setShowRotateConfirm(false);
    setCopiedKey(false);
  };

  const closeDetail = () => {
    setSelectedSpace(null);
    setShowRotateConfirm(false);
  };

  const openCreate = () => {
    setCreateForm({ ...emptyCreate });
    setCreateFieldErrors({});
    setCreateGeneralError(null);
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
  };

  const handleCreateNameChange = (name: string) => {
    setCreateForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === toSlug(prev.name) ? toSlug(name) : prev.slug,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFieldErrors({});
    setCreateGeneralError(null);

    const dto: CreatePartnerSpaceDto = {
      name: createForm.name.trim(),
      slug: createForm.slug.trim(),
      contactEmail: createForm.contactEmail.trim(),
      ...(createForm.webhookUrl?.trim() ? { webhookUrl: createForm.webhookUrl.trim() } : {}),
    };

    try {
      setSubmitting(true);
      await partnerSpacesService.create(dto);
      closeCreate();
      fetchSpaces().catch(() => {});
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setCreateFieldErrors(fieldErrors);
      setCreateGeneralError(general);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateKey = async () => {
    if (!selectedSpace) return;
    try {
      setRotating(true);
      setEditGeneralError(null);
      const updated = await partnerSpacesService.rotateKey(selectedSpace.id);
      setSelectedSpace(updated);
      setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setShowRotateConfirm(false);
      setCopiedKey(false);
    } catch (err) {
      const anyErr = err as any;
      const msg =
        anyErr?.response?.data?.message ||
        anyErr?.message ||
        "Failed to rotate key";
      setEditGeneralError(typeof msg === "string" ? msg : "Failed to rotate key");
      setShowRotateConfirm(false);
    } finally {
      setRotating(false);
    }
  };

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await partnerSpacesService.getAll();
      setSpaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load partner spaces");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ps-loading-container">
        <div>
          <div className="ps-spinner" />
          <p className="ps-loading-text">Loading partner spaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ps-error-container">
        <div className="ps-error-card">
          <p className="ps-error-title">Error Loading Data</p>
          <p className="ps-error-message">{error}</p>
          <button className="ps-btn ps-btn-secondary" onClick={fetchSpaces}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-screen">
      <div className="ps-content">
        <div className="ps-header">
          <div>
            <h1 className="ps-title">Partner Spaces</h1>
            <p className="ps-subtitle">Manage venues that embed the Swift catering widget</p>
          </div>
          <button className="ps-btn ps-btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Partner Space
          </button>
        </div>

        <div className="ps-table-container">
          {spaces.length === 0 ? (
            <div className="ps-empty">
              <p>No partner spaces yet. Click "Add Partner Space" to create one.</p>
            </div>
          ) : (
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Contact Email</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {spaces.map((space) => (
                  <tr
                    key={space.id}
                    className={!space.isActive ? "ps-row-inactive" : ""}
                    onClick={() => openDetail(space)}
                  >
                    <td>{space.name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{space.slug}</td>
                    <td>{space.contactEmail}</td>
                    <td>
                      <span className={`ps-badge ${space.isActive ? "ps-badge-active" : "ps-badge-inactive"}`}>
                        {space.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{new Date(space.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="ps-modal-overlay" onClick={closeCreate}>
          <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <h2 className="ps-modal-title">Add Partner Space</h2>
              <button className="ps-modal-close" onClick={closeCreate}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="ps-modal-body">
                {createGeneralError && (
                  <div className="ps-general-error">{createGeneralError}</div>
                )}

                <div className="ps-form-group">
                  <label className="ps-form-label">
                    Name <span className="ps-required">*</span>
                  </label>
                  <input
                    className={`ps-form-input${createFieldErrors.name ? " ps-input-error" : ""}`}
                    value={createForm.name}
                    onChange={(e) => handleCreateNameChange(e.target.value)}
                    placeholder="e.g. Grand Hotel London"
                    autoFocus
                  />
                  {createFieldErrors.name && (
                    <p className="ps-field-error">{createFieldErrors.name}</p>
                  )}
                </div>

                <div className="ps-form-group">
                  <label className="ps-form-label">
                    Slug <span className="ps-required">*</span>
                  </label>
                  <input
                    className={`ps-form-input${createFieldErrors.slug ? " ps-input-error" : ""}`}
                    value={createForm.slug}
                    onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="e.g. grand-hotel-london"
                  />
                  <p className="ps-form-hint">Auto-suggested from name. Must be unique.</p>
                  {createFieldErrors.slug && (
                    <p className="ps-field-error">{createFieldErrors.slug}</p>
                  )}
                </div>

                <div className="ps-form-group">
                  <label className="ps-form-label">
                    Contact Email <span className="ps-required">*</span>
                  </label>
                  <input
                    type="email"
                    className={`ps-form-input${createFieldErrors.contactEmail ? " ps-input-error" : ""}`}
                    value={createForm.contactEmail}
                    onChange={(e) => setCreateForm((p) => ({ ...p, contactEmail: e.target.value }))}
                    placeholder="contact@venue.com"
                  />
                  {createFieldErrors.contactEmail && (
                    <p className="ps-field-error">{createFieldErrors.contactEmail}</p>
                  )}
                </div>

                <div className="ps-form-group">
                  <label className="ps-form-label">Webhook URL</label>
                  <input
                    type="url"
                    className={`ps-form-input${createFieldErrors.webhookUrl ? " ps-input-error" : ""}`}
                    value={createForm.webhookUrl}
                    onChange={(e) => setCreateForm((p) => ({ ...p, webhookUrl: e.target.value }))}
                    placeholder="https://venue.com/webhooks/swift"
                  />
                  <p className="ps-form-hint">Optional. Must start with https://</p>
                  {createFieldErrors.webhookUrl && (
                    <p className="ps-field-error">{createFieldErrors.webhookUrl}</p>
                  )}
                </div>
              </div>

              <div className="ps-modal-actions">
                <button
                  type="button"
                  className="ps-btn ps-btn-secondary"
                  onClick={closeCreate}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ps-btn ps-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSpace && (
        <div className="ps-modal-overlay" onClick={closeDetail}>
          <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <h2 className="ps-modal-title">{selectedSpace.name}</h2>
              <button className="ps-modal-close" onClick={closeDetail}>
                <X size={20} />
              </button>
            </div>

            <div className="ps-modal-body">
              {editGeneralError && (
                <div className="ps-general-error">{editGeneralError}</div>
              )}

              <div className="ps-form-group">
                <label className="ps-form-label">
                  Name <span className="ps-required">*</span>
                </label>
                <input
                  className={`ps-form-input${editFieldErrors.name ? " ps-input-error" : ""}`}
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
                {editFieldErrors.name && (
                  <p className="ps-field-error">{editFieldErrors.name}</p>
                )}
              </div>

              <div className="ps-form-group">
                <label className="ps-form-label">
                  Slug <span className="ps-required">*</span>
                </label>
                <input
                  className={`ps-form-input${editFieldErrors.slug ? " ps-input-error" : ""}`}
                  value={editForm.slug}
                  onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))}
                />
                {editFieldErrors.slug && (
                  <p className="ps-field-error">{editFieldErrors.slug}</p>
                )}
              </div>

              <div className="ps-form-group">
                <label className="ps-form-label">
                  Contact Email <span className="ps-required">*</span>
                </label>
                <input
                  type="email"
                  className={`ps-form-input${editFieldErrors.contactEmail ? " ps-input-error" : ""}`}
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm((p) => ({ ...p, contactEmail: e.target.value }))}
                />
                {editFieldErrors.contactEmail && (
                  <p className="ps-field-error">{editFieldErrors.contactEmail}</p>
                )}
              </div>

              <div className="ps-form-group">
                <label className="ps-form-label">Webhook URL</label>
                <input
                  type="url"
                  className={`ps-form-input${editFieldErrors.webhookUrl ? " ps-input-error" : ""}`}
                  value={editForm.webhookUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, webhookUrl: e.target.value }))}
                  placeholder="https://"
                />
                {editFieldErrors.webhookUrl && (
                  <p className="ps-field-error">{editFieldErrors.webhookUrl}</p>
                )}
              </div>

              <p className="ps-section-label">Publishable Key</p>
              <div className="ps-key-box">
                <span className="ps-key-text">{selectedSpace.publishableKey}</span>
                <button
                  type="button"
                  className="ps-btn ps-btn-sm ps-btn-secondary"
                  onClick={handleCopyKey}
                >
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  {copiedKey ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="ps-toggle-row">
                <span className="ps-toggle-label">Active</span>
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
              </div>

              <p className="ps-section-label" style={{ marginTop: "1.5rem" }}>Danger Zone</p>
              {!showRotateConfirm ? (
                <button
                  type="button"
                  className="ps-btn ps-btn-secondary ps-btn-sm"
                  onClick={() => setShowRotateConfirm(true)}
                >
                  <RefreshCw size={14} />
                  Rotate Key
                </button>
              ) : (
                <div className="ps-rotate-warning">
                  <p className="ps-rotate-warning-text">
                    This will invalidate the current key. All widgets using it will stop working.
                  </p>
                  <div className="ps-rotate-actions">
                    <button
                      type="button"
                      className="ps-btn ps-btn-sm ps-btn-secondary"
                      onClick={() => setShowRotateConfirm(false)}
                      disabled={rotating}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ps-btn ps-btn-sm ps-btn-danger"
                      disabled={rotating}
                      onClick={handleRotateKey}
                    >
                      {rotating ? "Rotating..." : "Confirm Rotate"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="ps-modal-actions">
              <button
                type="button"
                className="ps-btn ps-btn-secondary"
                onClick={closeDetail}
                disabled={saving}
              >
                Close
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerSpacesScreen;
