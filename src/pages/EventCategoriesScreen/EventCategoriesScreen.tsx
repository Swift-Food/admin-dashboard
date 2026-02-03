import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderOpen,
  Tag,
  GripVertical,
} from "lucide-react";
import eventCategoryService from "../../services/event-category.service";
import type {
  EventCategory,
  EventSubcategory,
  DeletePreviewResponse,
} from "../../types/event-category.types";
import { renderLucideIcon } from "../../components/LucideIconPicker/LucideIconPicker";
import CategoryFormModal from "../../components/CategoryFormModal";
import SubcategoryFormModal from "../../components/SubcategoryFormModal";
import DeleteCategoryConfirmModal from "../../components/DeleteCategoryConfirmModal";
import "./EventCategoriesScreen.css";

const EventCategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [showEditSubcategory, setShowEditSubcategory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Selected items
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<EventSubcategory | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletePreviewResponse | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<EventCategory | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await eventCategoryService.getAllCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const formatCategoryName = (name: string): string => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Category handlers
  const handleAddCategory = async (data: { name: string; description?: string; iconName?: string }) => {
    try {
      setSubmitting(true);
      const newCategory = await eventCategoryService.createCategory(data);
      setCategories((prev) => [...prev, { ...newCategory, subcategories: [] }]);
      setShowAddCategory(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = async (data: { name: string; description?: string; iconName?: string }) => {
    if (!selectedCategory) return;
    try {
      setSubmitting(true);
      const updated = await eventCategoryService.updateCategory(selectedCategory.id, data);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      setShowEditCategory(false);
      setSelectedCategory(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: EventCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCategory(category);

    try {
      const preview = await eventCategoryService.deleteCategoryPreview(category.id);
      setDeletePreview(preview);
      setShowDeleteConfirm(true);
    } catch {
      if (confirm(`Are you sure you want to delete "${category.name}"? This will also delete all its subcategories.`)) {
        try {
          await eventCategoryService.deleteCategory(category.id, true);
          setCategories((prev) => prev.filter((c) => c.id !== category.id));
        } catch (delErr) {
          alert(delErr instanceof Error ? delErr.message : "Failed to delete category");
        }
      }
      setDeletingCategory(null);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      setSubmitting(true);
      await eventCategoryService.deleteCategory(deletingCategory.id, true);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      setShowDeleteConfirm(false);
      setDeletePreview(null);
      setDeletingCategory(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setSubmitting(false);
    }
  };

  // Subcategory handlers
  const handleAddSubcategory = async (data: { name: string; description?: string; iconName?: string }) => {
    if (!selectedCategory) return;
    try {
      setSubmitting(true);
      const newSubcat = await eventCategoryService.createSubcategory({
        ...data,
        categoryId: selectedCategory.id,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedCategory.id
            ? { ...c, subcategories: [...c.subcategories, newSubcat] }
            : c
        )
      );
      setShowAddSubcategory(false);
      setSelectedCategory(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create subcategory");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubcategory = async (data: { name: string; description?: string; iconName?: string }) => {
    if (!selectedSubcategory || !selectedCategory) return;
    try {
      setSubmitting(true);
      const updated = await eventCategoryService.updateSubcategory(selectedSubcategory.id, data);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedCategory.id
            ? { ...c, subcategories: c.subcategories.map((s) => (s.id === updated.id ? updated : s)) }
            : c
        )
      );
      setShowEditSubcategory(false);
      setSelectedSubcategory(null);
      setSelectedCategory(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update subcategory");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (category: EventCategory, subcategory: EventSubcategory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${subcategory.name}"?`)) return;

    try {
      await eventCategoryService.deleteSubcategory(subcategory.id);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id
            ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subcategory.id) }
            : c
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete subcategory");
    }
  };

  // UI handlers
  const openEditCategoryModal = (category: EventCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setShowEditCategory(true);
  };

  const openAddSubcategoryModal = (category: EventCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setShowAddSubcategory(true);
  };

  const openEditSubcategoryModal = (category: EventCategory, subcategory: EventSubcategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setShowEditSubcategory(true);
  };

  if (loading) {
    return (
      <div className="event-categories-loading">
        <div className="spinner"></div>
        <p>Loading event categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-categories-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button onClick={fetchCategories} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="event-categories-container">
      <div className="event-categories-header">
        <div>
          <h1>Event Categories</h1>
          <p>Manage event categories and subcategories</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddCategory(true)}>
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="event-categories-list">
        {categories.map((category) => (
          <div key={category.id} className="event-category-card">
            <div
              className="event-category-header"
              onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
            >
              <div className="event-category-info">
                {expandedCategory === category.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <div className="event-category-icon">
                  {category.iconName ? renderLucideIcon(category.iconName, 24, "#3b82f6") : <FolderOpen size={24} color="#3b82f6" />}
                </div>
                <div className="event-category-details">
                  <span className="event-category-name">{formatCategoryName(category.name)}</span>
                  {category.description && <span className="event-category-description">{category.description}</span>}
                </div>
                <span className="event-category-count">{category.eventCount} events</span>
                <span className="event-category-subcategories">{category.subcategories.length} subcategories</span>
              </div>
              <div className="event-category-actions">
                <button className="btn btn-sm btn-secondary" onClick={(e) => openEditCategoryModal(category, e)}>
                  <Edit2 size={16} /> Edit
                </button>
                <button className="btn btn-sm btn-primary" onClick={(e) => openAddSubcategoryModal(category, e)}>
                  <Plus size={16} /> Add Subcategory
                </button>
                <button className="btn btn-sm btn-danger" onClick={(e) => handleDeleteCategory(category, e)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {expandedCategory === category.id && (
              <div className="event-subcategories-container">
                {category.subcategories.length === 0 ? (
                  <div className="event-subcategories-empty">No subcategories yet. Add one to get started.</div>
                ) : (
                  <div className="event-subcategories-list">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="event-subcategory-item">
                        <div className="event-subcategory-info">
                          <GripVertical size={16} className="drag-handle" />
                          <div className="event-subcategory-icon">
                            {subcategory.iconName ? renderLucideIcon(subcategory.iconName, 18, "#6b7280") : <Tag size={18} color="#6b7280" />}
                          </div>
                          <div className="event-subcategory-details">
                            <span className="event-subcategory-name">{subcategory.name}</span>
                            {subcategory.description && <span className="event-subcategory-description">{subcategory.description}</span>}
                          </div>
                          <span className="event-subcategory-order">#{subcategory.displayOrder}</span>
                        </div>
                        <div className="event-subcategory-actions">
                          <button className="btn btn-xs btn-secondary" onClick={(e) => openEditSubcategoryModal(category, subcategory, e)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-xs btn-danger" onClick={(e) => handleDeleteSubcategory(category, subcategory, e)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Category Modals */}
      <CategoryFormModal
        isOpen={showAddCategory}
        mode="add"
        isSubmitting={submitting}
        onSubmit={handleAddCategory}
        onClose={() => setShowAddCategory(false)}
      />

      <CategoryFormModal
        isOpen={showEditCategory}
        mode="edit"
        initialData={selectedCategory ? {
          name: selectedCategory.name,
          description: selectedCategory.description || "",
          iconName: selectedCategory.iconName,
        } : undefined}
        isSubmitting={submitting}
        onSubmit={handleEditCategory}
        onClose={() => {
          setShowEditCategory(false);
          setSelectedCategory(null);
        }}
      />

      {/* Subcategory Modals */}
      <SubcategoryFormModal
        isOpen={showAddSubcategory}
        mode="add"
        parentCategoryName={selectedCategory ? formatCategoryName(selectedCategory.name) : undefined}
        isSubmitting={submitting}
        onSubmit={handleAddSubcategory}
        onClose={() => {
          setShowAddSubcategory(false);
          setSelectedCategory(null);
        }}
      />

      <SubcategoryFormModal
        isOpen={showEditSubcategory}
        mode="edit"
        initialData={selectedSubcategory ? {
          name: selectedSubcategory.name,
          description: selectedSubcategory.description || "",
          iconName: selectedSubcategory.iconName,
        } : undefined}
        isSubmitting={submitting}
        onSubmit={handleEditSubcategory}
        onClose={() => {
          setShowEditSubcategory(false);
          setSelectedSubcategory(null);
          setSelectedCategory(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCategoryConfirmModal
        isOpen={showDeleteConfirm}
        preview={deletePreview}
        isDeleting={submitting}
        onConfirm={confirmDeleteCategory}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletePreview(null);
          setDeletingCategory(null);
        }}
        formatCategoryName={formatCategoryName}
      />
    </div>
  );
};

export default EventCategoriesScreen;
