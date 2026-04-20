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

// Suppress unused-variable warnings for helpers wired in future tasks
void toSlug;
void parseApiErrors;

const PartnerSpacesScreen = () => {
  const [spaces, setSpaces] = useState<PartnerSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal — used in Task 6
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

  // Suppress unused-state warnings for future-task state — referenced via void to keep tsc happy
  void showCreate;
  void createForm;
  void setCreateForm;
  void submitting;
  void createFieldErrors;
  void createGeneralError;
  void saving;
  void rotating;
  // Suppress unused icon imports
  void X; void Copy; void Check; void RefreshCw;

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

  // closeDetail wired in Task 7 detail modal
  void closeDetail;

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
          <button className="ps-btn ps-btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Add Partner Space
          </button>
        </div>

        {/* List table — Task 5 */}
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
    </div>
  );
};

export default PartnerSpacesScreen;
