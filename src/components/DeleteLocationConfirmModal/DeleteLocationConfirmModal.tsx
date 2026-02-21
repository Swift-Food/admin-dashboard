import React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import type { EventLocation } from "../../types/event-location.types";
import "./DeleteLocationConfirmModal.css";

interface DeleteLocationConfirmModalProps {
  isOpen: boolean;
  location: EventLocation | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteLocationConfirmModal: React.FC<DeleteLocationConfirmModalProps> = ({
  isOpen,
  location,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !location) return null;

  const hasEvents = location.eventCount > 0;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content delete-location-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`delete-icon-wrap ${hasEvents ? "delete-icon-warn" : "delete-icon-danger"}`}>
          {hasEvents ? <AlertCircle size={28} /> : <AlertTriangle size={28} />}
        </div>

        <h2>{hasEvents ? "Cannot Delete Location" : "Delete Location"}</h2>

        {hasEvents ? (
          <>
            <p className="delete-body">
              <strong>{location.name}</strong> is currently used by{" "}
              <strong>{location.eventCount} event{location.eventCount !== 1 ? "s" : ""}</strong>.
              You must reassign or remove those events before deleting this location.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onCancel}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="delete-body">
              Are you sure you want to delete <strong>{location.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onCancel} disabled={isDeleting}>
                Cancel
              </button>
              <button
                className="btn btn-danger-solid"
                onClick={onConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Location"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteLocationConfirmModal;
