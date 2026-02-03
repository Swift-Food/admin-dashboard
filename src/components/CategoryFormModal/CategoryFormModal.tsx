import React, { useState, useEffect } from "react";
import LucideIconPicker from "../LucideIconPicker/LucideIconPicker";
import "./CategoryFormModal.css";

interface CategoryFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData?: {
    name: string;
    description: string;
    iconName: string | null;
  };
  isSubmitting: boolean;
  onSubmit: (data: { name: string; description?: string; iconName?: string }) => void;
  onClose: () => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  mode,
  initialData,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setIconName(initialData.iconName);
    } else if (isOpen && !initialData) {
      setName("");
      setDescription("");
      setIconName(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description || undefined,
      iconName: iconName || undefined,
    });
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setIconName(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === "add" ? "Add Category" : "Edit Category"}</h2>
        <p className="modal-subtitle">
          {mode === "add" ? "Create a new event category" : "Update category details"}
        </p>

        <div className="form-group">
          <label>Category Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Music, Sports, Business"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this category"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Icon</label>
          <LucideIconPicker
            value={iconName}
            onChange={setIconName}
            placeholder="Select a category icon..."
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting
              ? mode === "add" ? "Creating..." : "Saving..."
              : mode === "add" ? "Create Category" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryFormModal;
