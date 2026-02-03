import React from "react";
import type { DeletePreviewResponse } from "../../types/event-category.types";
import "./DeleteCategoryConfirmModal.css";

interface DeleteCategoryConfirmModalProps {
  isOpen: boolean;
  preview: DeletePreviewResponse | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  formatCategoryName: (name: string) => string;
}

const DeleteCategoryConfirmModal: React.FC<DeleteCategoryConfirmModalProps> = ({
  isOpen,
  preview,
  isDeleting,
  onConfirm,
  onCancel,
  formatCategoryName,
}) => {
  if (!isOpen || !preview) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <h2>Delete Category: {formatCategoryName(preview.categoryName)}</h2>

        {preview.eventsToDelete.length === 0 && preview.eventsToUpdate.length === 0 ? (
          <p>This category has no associated events. It will be deleted along with its subcategories.</p>
        ) : (
          <>
            {preview.eventsToUpdate.length > 0 && (
              <div className="delete-preview-section">
                <h4>Events that will have this category removed ({preview.eventsToUpdate.length}):</h4>
                <ul className="delete-preview-list">
                  {preview.eventsToUpdate.map((event) => (
                    <li key={event.id}>{event.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.eventsToDelete.length > 0 && (
              <div className="delete-preview-section delete-warning">
                <h4>The following events will be DELETED ({preview.eventsToDelete.length}):</h4>
                <p className="warning-text">
                  These events only have this category. Deleting the category will also delete these events permanently.
                </p>
                <ul className="delete-preview-list">
                  {preview.eventsToDelete.map((event) => (
                    <li key={event.id}>{event.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? "Deleting..."
              : preview.eventsToDelete.length > 0
                ? `Delete Category & ${preview.eventsToDelete.length} Event(s)`
                : "Delete Category"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCategoryConfirmModal;
