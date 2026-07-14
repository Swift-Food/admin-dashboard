import { useEffect, useState } from "react";
import { Plus, X, Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import partnerSpacesService from "../../services/partner-spaces.service";
import type {
  PartnerSpace,
  CreatePartnerSpaceDto,
  UpdatePartnerSpaceDto,
  AiPipelineVariant,
} from "../../types/partner-spaces.types";
import "./PartnerSpacesScreen.css";
import CateringImageUpload from "../../components/CateringImageUpload";
import ColorField from "../../components/ColorField/ColorField";
import { uploadImage } from "../../services/bundles.service";

// Mirrors the backend's @Matches regex on CreatePartnerSpaceDto.allowedOrigins.
// scheme://host[:port], no path, no trailing slash.
const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i;

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
    else if (lower.includes("origin")) fieldErrors.allowedOrigins = msg;
    else if (lower.includes("name")) fieldErrors.name = msg;
    else general = msg;
  }

  if (Object.keys(fieldErrors).length === 0 && !general) {
    general = messages[0] ?? "An error occurred";
  }

  return { fieldErrors, general };
};

interface CreateFormState extends CreatePartnerSpaceDto {
  allowedOrigins: string[];
  logoImageUrl: string;
  themePrimary: string;
}

const emptyCreate: CreateFormState = {
  name: "",
  slug: "",
  contactEmail: "",
  webhookUrl: "",
  allowedOrigins: [],
  logoImageUrl: "",
  themePrimary: "#fa43ad",
};

const WebhookDetails = () => (
  <details className="ps-webhook-details">
    <summary>What does Swift send to this URL?</summary>
    <div className="ps-webhook-details-body">
      <p>
        After a catering order is submitted via this partner's widget, Swift
        fires a single <code>POST</code> request to this URL with a 5-second
        timeout. Failures are logged but do not block the order — there is
        no retry. The body is JSON:
      </p>
      <pre className="ps-webhook-payload">
{`{
  "event": "order.created",
  "orderId": "<uuid>",
  "status": "<order status>",
  "partnerSpaceId": "<this partner's id>"
}`}
      </pre>
      <p className="ps-webhook-meta">
        <strong>Headers:</strong> <code>Content-Type: application/json</code>.
        No signature today — verify the source by IP-allowlisting Swift's
        egress, by checking that the <code>partnerSpaceId</code> matches your
        own provisioned id, or by ignoring the body and using the order id
        to call back into Swift's order-view API.
      </p>
      <p className="ps-webhook-meta">
        <strong>When it fires:</strong> exactly once, the moment the order
        is created. It does not fire for status changes (e.g. accepted,
        delivered) — for those, poll the order-view API or use the widget's{" "}
        <code>onOrderComplete</code> client-side callback.
      </p>
    </div>
  </details>
);

interface OriginsEditorProps {
  origins: string[];
  onChange: (next: string[]) => void;
  fieldError?: string;
}

const OriginsEditor = ({ origins, onChange, fieldError }: OriginsEditorProps) => {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!ORIGIN_RE.test(v)) {
      setDraftError(
        "Must be scheme://host[:port] — e.g. https://acme.com or http://localhost:3000."
      );
      return;
    }
    const lower = v.toLowerCase();
    if (origins.includes(lower)) {
      setDraftError("Already in the list.");
      return;
    }
    onChange([...origins, lower]);
    setDraft("");
    setDraftError(null);
  };

  const remove = (i: number) => onChange(origins.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="ps-origin-input-row">
        <input
          className={`ps-form-input${draftError || fieldError ? " ps-input-error" : ""}`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (draftError) setDraftError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="https://acme.com"
        />
        <button
          type="button"
          className="ps-btn ps-btn-secondary ps-btn-sm"
          onClick={add}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {(draftError || fieldError) && (
        <p className="ps-field-error">{draftError || fieldError}</p>
      )}
      {origins.length === 0 ? (
        <p className="ps-origin-warning">
          ⚠ No origins set — this key will work from any site that knows it.
          Add at least one origin for production use.
        </p>
      ) : (
        <ul className="ps-origin-list">
          {origins.map((o, i) => (
            <li key={`${o}-${i}`} className="ps-origin-item">
              <code>{o}</code>
              <button
                type="button"
                className="ps-origin-remove"
                onClick={() => remove(i)}
                aria-label={`Remove ${o}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="ps-form-hint">
        Browser origins permitted to use this key. Strict equality — list each
        subdomain and environment explicitly.
      </p>
    </div>
  );
};


const PartnerSpacesScreen = () => {
  const [spaces, setSpaces] = useState<PartnerSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({ ...emptyCreate });
  const [submitting, setSubmitting] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [createGeneralError, setCreateGeneralError] = useState<string | null>(null);

  const [selectedSpace, setSelectedSpace] = useState<PartnerSpace | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    slug: string;
    contactEmail: string;
    webhookUrl: string;
    allowedOrigins: string[];
    isActive: boolean;
    aiChatEnabled: boolean;
    aiPipelineVariant: AiPipelineVariant;
    logoImageUrl: string;
    themePrimary: string;
  }>({
    name: "",
    slug: "",
    contactEmail: "",
    webhookUrl: "",
    allowedOrigins: [],
    isActive: true,
    aiChatEnabled: false,
    aiPipelineVariant: "legacy",
    logoImageUrl: "",
    themePrimary: "#fa43ad",
  });
  const [saving, setSaving] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editGeneralError, setEditGeneralError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  const handleLogoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    apply: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      alert("Please select a valid image (JPEG, PNG, WebP, GIF, or SVG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Logo must be less than 5MB");
      return;
    }
    try {
      setUploadingLogo(true);
      // Read the file fully into memory and re-wrap it as a fresh File before
      // uploading. Uploading a raw <input> File directly can transmit an empty
      // body (sharp then fails with "Input Buffer is empty"); every other image
      // uploader in this app uploads a re-wrapped in-memory File. Preserve the
      // original mime type so PNG/SVG logos keep transparency.
      const buffer = await file.arrayBuffer();
      const safeFile = new File([buffer], file.name || "logo", { type: file.type });
      const url = await uploadImage(safeFile);
      apply(url);
    } catch (err) {
      alert(`Failed to upload logo: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
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
      webhookUrl: editForm.webhookUrl?.trim() || null,
      allowedOrigins: editForm.allowedOrigins,
      isActive: editForm.isActive,
      aiChatEnabled: editForm.aiChatEnabled,
      aiPipelineVariant: editForm.aiPipelineVariant,
      logoImageUrl: editForm.logoImageUrl || null,
      theme: /^#[0-9a-fA-F]{6}$/.test(editForm.themePrimary)
        ? { primary: editForm.themePrimary }
        : null,
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
      allowedOrigins: space.allowedOrigins ?? [],
      isActive: space.isActive,
      aiChatEnabled: space.aiChatEnabled ?? false,
      aiPipelineVariant: space.aiPipelineVariant ?? "legacy",
      logoImageUrl: space.logoImageUrl ?? "",
      themePrimary: space.theme?.primary ?? "#fa43ad",
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
      ...(createForm.allowedOrigins.length ? { allowedOrigins: createForm.allowedOrigins } : {}),
      logoImageUrl: createForm.logoImageUrl || undefined,
      theme: /^#[0-9a-fA-F]{6}$/.test(createForm.themePrimary)
        ? { primary: createForm.themePrimary }
        : undefined,
    };

    try {
      setSubmitting(true);
      await partnerSpacesService.create(dto);
      closeCreate();
      fetchSpaces().catch(() => {
        setError("Partner created, but failed to refresh the list. Please reload.");
      });
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
            <h1 className="ps-title">Embed Partners</h1>
            <p className="ps-subtitle">
              Companies that embed the Swift catering widget on their own
              website. Each one gets a publishable key the widget uses to
              talk to our API. Distinct from coworking spaces, which run a
              separate B2B order pipeline.
            </p>
          </div>
          <button className="ps-btn ps-btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Embed Partner
          </button>
        </div>

        <div className="ps-table-container">
          {spaces.length === 0 ? (
            <div className="ps-empty">
              <p>No embed partners yet. Click "Add Embed Partner" to create one.</p>
            </div>
          ) : (
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Contact Email</th>
                  <th>Origins</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {spaces.map((space) => {
                  const originCount = space.allowedOrigins?.length ?? 0;
                  return (
                    <tr
                      key={space.id}
                      className={!space.isActive ? "ps-row-inactive" : ""}
                      onClick={() => openDetail(space)}
                    >
                      <td>{space.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{space.slug}</td>
                      <td>{space.contactEmail}</td>
                      <td>
                        {originCount === 0 ? (
                          <span className="ps-origin-count-empty" title="Any origin can use this key">
                            ⚠ none
                          </span>
                        ) : (
                          <span title={space.allowedOrigins.join(", ")}>
                            {originCount} {originCount === 1 ? "origin" : "origins"}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`ps-badge ${space.isActive ? "ps-badge-active" : "ps-badge-inactive"}`}>
                          {space.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{new Date(space.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="ps-modal-overlay" onClick={closeCreate}>
          <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <h2 className="ps-modal-title">Add Embed Partner</h2>
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
                  <p className="ps-form-hint">
                    Optional. Server-to-server callback fired when a catering
                    order is submitted via this partner's widget. Must use
                    https://. Most partners don't need this — the widget
                    already calls <code>onOrderComplete</code> client-side
                    with the same data.
                  </p>
                  <WebhookDetails />
                  {createFieldErrors.webhookUrl && (
                    <p className="ps-field-error">{createFieldErrors.webhookUrl}</p>
                  )}
                </div>

                <div className="ps-form-group">
                  <label className="ps-form-label">Allowed Origins</label>
                  <OriginsEditor
                    origins={createForm.allowedOrigins}
                    onChange={(next) =>
                      setCreateForm((p) => ({ ...p, allowedOrigins: next }))
                    }
                    fieldError={createFieldErrors.allowedOrigins}
                  />
                </div>

                <div className="ps-form-group">
                  <label className="ps-form-label">Logo</label>
                  <CateringImageUpload
                    imageUrl={createForm.logoImageUrl || undefined}
                    isUploading={uploadingLogo}
                    onImageSelect={(e) =>
                      handleLogoSelect(e, (url) =>
                        setCreateForm((p) => ({ ...p, logoImageUrl: url })),
                      )
                    }
                    onImageRemove={() =>
                      setCreateForm((p) => ({ ...p, logoImageUrl: "" }))
                    }
                  />
                  <p className="ps-form-hint">
                    Shown on the branded catering page header. Optional.
                  </p>
                </div>

                <ColorField
                  label="Accent color"
                  value={createForm.themePrimary}
                  onChange={(hex) => setCreateForm((p) => ({ ...p, themePrimary: hex }))}
                  hint="Primary color applied to the branded catering widget."
                />
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
                  {submitting ? "Creating..." : "Create Partner"}
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
                <p className="ps-form-hint">
                  Optional. Server-to-server callback fired when a catering
                  order is submitted via this partner's widget. Must use
                  https://. Most partners don't need this — the widget
                  already calls <code>onOrderComplete</code> client-side with
                  the same data.
                </p>
                <WebhookDetails />
                {editFieldErrors.webhookUrl && (
                  <p className="ps-field-error">{editFieldErrors.webhookUrl}</p>
                )}
              </div>

              <div className="ps-form-group">
                <label className="ps-form-label">Allowed Origins</label>
                <OriginsEditor
                  origins={editForm.allowedOrigins}
                  onChange={(next) =>
                    setEditForm((p) => ({ ...p, allowedOrigins: next }))
                  }
                  fieldError={editFieldErrors.allowedOrigins}
                />
              </div>

              <div className="ps-form-group">
                <label className="ps-form-label">Logo</label>
                <CateringImageUpload
                  imageUrl={editForm.logoImageUrl || undefined}
                  isUploading={uploadingLogo}
                  onImageSelect={(e) =>
                    handleLogoSelect(e, (url) =>
                      setEditForm((p) => ({ ...p, logoImageUrl: url })),
                    )
                  }
                  onImageRemove={() => setEditForm((p) => ({ ...p, logoImageUrl: "" }))}
                />
                <p className="ps-form-hint">
                  Shown on the branded catering page header. Optional.
                </p>
              </div>

              <ColorField
                label="Accent color"
                value={editForm.themePrimary}
                onChange={(hex) => setEditForm((p) => ({ ...p, themePrimary: hex }))}
                hint="Primary color applied to the branded catering widget."
              />

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

              <div className="ps-toggle-row">
                <span className="ps-toggle-label">AI Chat enabled</span>
                <input
                  type="checkbox"
                  checked={editForm.aiChatEnabled}
                  onChange={(e) => setEditForm((p) => ({ ...p, aiChatEnabled: e.target.checked }))}
                />
              </div>

              <div className="ps-toggle-row">
                <span className="ps-toggle-label">AI Pipeline variant</span>
                <select
                  value={editForm.aiPipelineVariant}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      aiPipelineVariant: e.target.value as AiPipelineVariant,
                    }))
                  }
                  disabled={!editForm.aiChatEnabled}
                  title={
                    editForm.aiChatEnabled
                      ? "legacy = single Pro call. pipeline_v1 = multi-stage Flash pipeline (cheaper)."
                      : "Enable AI Chat first."
                  }
                >
                  <option value="legacy">legacy (single Pro call)</option>
                  <option value="pipeline_v1">pipeline_v1 (multi-stage Flash)</option>
                </select>
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
