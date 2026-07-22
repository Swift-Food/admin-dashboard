import React, { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import coworkingAdminService from "../../services/coworking-admin.service";
import type { CoworkingSpace } from "../../types/coworking.types";
import "./CoworkingSpacesScreen.css";

const CoworkingSpacesScreen: React.FC = () => {
  const [spaces, setSpaces] = useState<CoworkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resetModalSpace, setResetModalSpace] = useState<CoworkingSpace | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const data = await coworkingAdminService.getSpaces();
      setSpaces(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, value: string) => {
    try {
      setUpdatingId(id);
      const isActive = value === "active";
      await coworkingAdminService.updateSpace(id, { isActive });
      setSpaces(
        spaces.map((s) => (s.id === id ? { ...s, isActive } : s))
      );
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "An error occurred"}`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleExpand = (spaceId: string) => {
    setExpandedId(expandedId === spaceId ? null : spaceId);
  };

  const handleResetStripe = async () => {
    if (!resetModalSpace) return;

    try {
      setResettingId(resetModalSpace.id);
      await coworkingAdminService.resetStripe(resetModalSpace.id);
      setResetModalSpace(null);
      await fetchSpaces();
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "Failed to reset Stripe"}`
      );
    } finally {
      setResettingId(null);
    }
  };

  if (loading) {
    return (
      <div className="coworking-loading-container">
        <div className="coworking-loading-content">
          <div className="coworking-spinner"></div>
          <p className="coworking-loading-text">Loading spaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coworking-error-container">
        <div className="coworking-error-card">
          <div className="coworking-error-header">
            <AlertCircle className="coworking-error-icon" size={24} />
            <div>
              <h3 className="coworking-error-title">Error Loading Data</h3>
              <p className="coworking-error-message">{error}</p>
            </div>
          </div>
          <button onClick={fetchSpaces} className="coworking-retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="coworking-container">
      <div className="coworking-content">
        <div className="coworking-header">
          <h1 className="coworking-title">Coworking Spaces</h1>
          <p className="coworking-subtitle">
            Manage coworking spaces and Stripe connections
          </p>
        </div>

        <div className="coworking-table-container">
          <div className="coworking-table-wrapper">
            <table className="coworking-table">
              <thead>
                <tr>
                  <th>Space</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Stripe</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {spaces.map((space) => (
                  <React.Fragment key={space.id}>
                    <tr className="coworking-row">
                      <td>
                        <span className="coworking-space-name">
                          {space.name}
                        </span>
                      </td>
                      <td>
                        <span className="coworking-slug">{space.slug}</span>
                      </td>
                      <td>
                        <div className="coworking-status-cell">
                          <select
                            value={space.isActive ? "active" : "inactive"}
                            onChange={(e) =>
                              handleStatusChange(space.id, e.target.value)
                            }
                            disabled={updatingId === space.id}
                            className={`coworking-status-select ${
                              space.isActive
                                ? "coworking-status-active"
                                : "coworking-status-inactive"
                            }`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {updatingId === space.id && (
                            <div className="coworking-btn-spinner"></div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`coworking-stripe-badge ${
                            space.stripeAccountId
                              ? "coworking-stripe-connected"
                              : "coworking-stripe-not-connected"
                          }`}
                        >
                          {space.stripeAccountId
                            ? "Connected"
                            : "Not connected"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleExpand(space.id)}
                          className="coworking-btn-details"
                        >
                          {expandedId === space.id ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === space.id && (
                      <tr>
                        <td colSpan={5} className="coworking-expanded-cell">
                          <div className="coworking-detail-panel">
                            <div className="coworking-detail-grid">
                              {/* Left: Space Info */}
                              <div className="coworking-detail-section">
                                <h3 className="coworking-detail-section-title">
                                  Space Info
                                </h3>
                                <div className="coworking-detail-field">
                                  <span className="coworking-detail-label">
                                    Name
                                  </span>
                                  <span className="coworking-detail-value">
                                    {space.name}
                                  </span>
                                </div>
                                <div className="coworking-detail-field">
                                  <span className="coworking-detail-label">
                                    Slug
                                  </span>
                                  <span className="coworking-detail-value coworking-detail-value-code">
                                    {space.slug}
                                  </span>
                                </div>
                                <div className="coworking-detail-field">
                                  <span className="coworking-detail-label">
                                    Deposit Enabled
                                  </span>
                                  <span
                                    className={`coworking-detail-value ${
                                      space.depositEnabled
                                        ? "coworking-detail-value-yes"
                                        : "coworking-detail-value-no"
                                    }`}
                                  >
                                    {space.depositEnabled ? "Yes" : "No"}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Stripe Connection */}
                              <div className="coworking-detail-section">
                                <h3 className="coworking-detail-section-title">
                                  Stripe Connection
                                </h3>
                                <div className="coworking-detail-field">
                                  <span className="coworking-detail-label">
                                    Account ID
                                  </span>
                                  <span className="coworking-detail-value coworking-detail-value-code">
                                    {space.stripeAccountId
                                      ? space.stripeAccountId.length > 20
                                        ? space.stripeAccountId.slice(0, 20) + "..."
                                        : space.stripeAccountId
                                      : "N/A"}
                                  </span>
                                </div>
                                <div className="coworking-detail-field">
                                  <span className="coworking-detail-label">
                                    Onboarding Complete
                                  </span>
                                  <span
                                    className={`coworking-detail-value ${
                                      space.stripeOnboardingComplete
                                        ? "coworking-detail-value-yes"
                                        : "coworking-detail-value-no"
                                    }`}
                                  >
                                    {space.stripeOnboardingComplete
                                      ? "Yes"
                                      : "No"}
                                  </span>
                                </div>

                                {space.stripeAccountId ? <div className="coworking-reset-stripe-section">
                                    <button
                                      className="coworking-btn-reset-stripe"
                                      onClick={() =>
                                        setResetModalSpace(space)
                                      }
                                    >
                                      Reset Stripe Connection
                                    </button>
                                    <p className="coworking-reset-hint">
                                      Clears Stripe account ID so the space can
                                      reconnect fresh.
                                    </p>
                                  </div> : null}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {spaces.length === 0 && (
          <div className="coworking-empty-state">
            <p>No coworking spaces found</p>
          </div>
        )}
      </div>

      {/* Reset Stripe Confirmation Modal */}
      {resetModalSpace ? <div
          className="coworking-modal-overlay"
          onClick={() => !resettingId && setResetModalSpace(null)}
        >
          <div
            className="coworking-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="coworking-modal-header">
              <h2>Reset Stripe Connection?</h2>
              <button
                className="coworking-modal-close"
                onClick={() => !resettingId && setResetModalSpace(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="coworking-modal-body">
              <p>
                Are you sure? This will disconnect Stripe for{" "}
                <span className="coworking-modal-space-name">
                  {resetModalSpace.name}
                </span>
                . They will need to reconnect.
              </p>
            </div>
            <div className="coworking-modal-actions">
              <button
                className="coworking-btn-cancel"
                onClick={() => setResetModalSpace(null)}
                disabled={!!resettingId}
              >
                Cancel
              </button>
              <button
                className="coworking-btn-confirm-reset"
                onClick={handleResetStripe}
                disabled={!!resettingId}
              >
                {resettingId ? "Resetting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div> : null}
    </div>
  );
};

export default CoworkingSpacesScreen;
