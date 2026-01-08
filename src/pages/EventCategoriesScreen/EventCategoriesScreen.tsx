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
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
} from "../../types/event-category.types";
import LucideIconPicker, {
  renderLucideIcon,
} from "../../components/LucideIconPicker/LucideIconPicker";
import "./EventCategoriesScreen.css";

const EventCategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Modal states
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [showEditSubcategory, setShowEditSubcategory] = useState(false);

  // Selected items
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<EventSubcategory | null>(null);

  // Form states for category
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryIconName, setCategoryIconName] = useState<string | null>(null);

  // Form states for subcategory
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryDescription, setSubcategoryDescription] = useState("");
  const [subcategoryIconName, setSubcategoryIconName] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

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

  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  // Category Create
  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;

    try {
      setSubmitting(true);
      const dto: CreateCategoryDto = {
        name: categoryName.trim(),
        description: categoryDescription || undefined,
        iconName: categoryIconName || undefined,
      };

      const newCategory = await eventCategoryService.createCategory(dto);
      setCategories((prev) => [...prev, { ...newCategory, subcategories: [] }]);
      setShowAddCategory(false);
      resetCategoryForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  };

  // Category Edit
  const openEditCategoryModal = (category: EventCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryIconName(category.iconName);
    setShowEditCategory(true);
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !categoryName.trim()) return;

    try {
      setSubmitting(true);
      const dto: UpdateCategoryDto = {
        name: categoryName.trim(),
        description: categoryDescription || undefined,
        iconName: categoryIconName || undefined,
      };

      const updated = await eventCategoryService.updateCategory(selectedCategory.id, dto);

      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );

      setShowEditCategory(false);
      resetCategoryForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSubmitting(false);
    }
  };

  // Category Delete
  const handleDeleteCategory = async (category: EventCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all its subcategories.`)) return;

    try {
      await eventCategoryService.deleteCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  const resetCategoryForm = () => {
    setSelectedCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryIconName(null);
  };

  // Subcategory Add
  const openAddSubcategoryModal = (category: EventCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setShowAddSubcategory(true);
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory || !subcategoryName.trim()) return;

    try {
      setSubmitting(true);
      const dto: CreateSubcategoryDto = {
        name: subcategoryName.trim(),
        categoryId: selectedCategory.id,
        description: subcategoryDescription || undefined,
        iconName: subcategoryIconName || undefined,
      };

      const newSubcat = await eventCategoryService.createSubcategory(dto);

      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedCategory.id
            ? { ...c, subcategories: [...c.subcategories, newSubcat] }
            : c
        )
      );

      setShowAddSubcategory(false);
      resetSubcategoryForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create subcategory");
    } finally {
      setSubmitting(false);
    }
  };

  // Subcategory Edit
  const openEditSubcategoryModal = (
    category: EventCategory,
    subcategory: EventSubcategory,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setSubcategoryName(subcategory.name);
    setSubcategoryDescription(subcategory.description || "");
    setSubcategoryIconName(subcategory.iconName);
    setShowEditSubcategory(true);
  };

  const handleUpdateSubcategory = async () => {
    if (!selectedSubcategory || !subcategoryName.trim()) return;

    try {
      setSubmitting(true);
      const dto: UpdateSubcategoryDto = {
        name: subcategoryName.trim(),
        description: subcategoryDescription || undefined,
        iconName: subcategoryIconName || undefined,
      };

      const updated = await eventCategoryService.updateSubcategory(selectedSubcategory.id, dto);

      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedCategory?.id
            ? {
                ...c,
                subcategories: c.subcategories.map((s) =>
                  s.id === updated.id ? updated : s
                ),
              }
            : c
        )
      );

      setShowEditSubcategory(false);
      resetSubcategoryForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update subcategory");
    } finally {
      setSubmitting(false);
    }
  };

  // Subcategory Delete
  const handleDeleteSubcategory = async (
    category: EventCategory,
    subcategory: EventSubcategory,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${subcategory.name}"?`)) return;

    try {
      await eventCategoryService.deleteSubcategory(subcategory.id);

      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id
            ? {
                ...c,
                subcategories: c.subcategories.filter((s) => s.id !== subcategory.id),
              }
            : c
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete subcategory");
    }
  };

  const resetSubcategoryForm = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategoryName("");
    setSubcategoryDescription("");
    setSubcategoryIconName(null);
  };

  // Format category name for display
  const formatCategoryName = (name: string): string => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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
        <button
          className="btn btn-primary"
          onClick={() => setShowAddCategory(true)}
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="event-categories-list">
        {categories.map((category) => (
          <div key={category.id} className="event-category-card">
            <div
              className="event-category-header"
              onClick={() => handleExpandCategory(category.id)}
            >
              <div className="event-category-info">
                {expandedCategory === category.id ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <div className="event-category-icon">
                  {category.iconName ? (
                    renderLucideIcon(category.iconName, 24, "#3b82f6")
                  ) : (
                    <FolderOpen size={24} color="#3b82f6" />
                  )}
                </div>
                <div className="event-category-details">
                  <span className="event-category-name">
                    {formatCategoryName(category.name)}
                  </span>
                  {category.description && (
                    <span className="event-category-description">
                      {category.description}
                    </span>
                  )}
                </div>
                <span className="event-category-count">
                  {category.eventCount} events
                </span>
                <span className="event-category-subcategories">
                  {category.subcategories.length} subcategories
                </span>
              </div>
              <div className="event-category-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={(e) => openEditCategoryModal(category, e)}
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={(e) => openAddSubcategoryModal(category, e)}
                >
                  <Plus size={16} /> Add Subcategory
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => handleDeleteCategory(category, e)}
                  title={category.eventCount > 0 ? "Cannot delete - has events" : "Delete category"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {expandedCategory === category.id && (
              <div className="event-subcategories-container">
                {category.subcategories.length === 0 ? (
                  <div className="event-subcategories-empty">
                    No subcategories yet. Add one to get started.
                  </div>
                ) : (
                  <div className="event-subcategories-list">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="event-subcategory-item">
                        <div className="event-subcategory-info">
                          <GripVertical size={16} className="drag-handle" />
                          <div className="event-subcategory-icon">
                            {subcategory.iconName ? (
                              renderLucideIcon(subcategory.iconName, 18, "#6b7280")
                            ) : (
                              <Tag size={18} color="#6b7280" />
                            )}
                          </div>
                          <div className="event-subcategory-details">
                            <span className="event-subcategory-name">
                              {subcategory.name}
                            </span>
                            {subcategory.description && (
                              <span className="event-subcategory-description">
                                {subcategory.description}
                              </span>
                            )}
                          </div>
                          <span className="event-subcategory-order">
                            #{subcategory.displayOrder}
                          </span>
                        </div>
                        <div className="event-subcategory-actions">
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={(e) =>
                              openEditSubcategoryModal(category, subcategory, e)
                            }
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-xs btn-danger"
                            onClick={(e) =>
                              handleDeleteSubcategory(category, subcategory, e)
                            }
                          >
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

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="modal-overlay" onClick={() => setShowAddCategory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Category</h2>
            <p className="modal-subtitle">Create a new event category</p>

            <div className="form-group">
              <label>Category Name *</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Music, Sports, Business"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Icon</label>
              <LucideIconPicker
                value={categoryIconName}
                onChange={setCategoryIconName}
                placeholder="Select a category icon..."
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddCategory(false);
                  resetCategoryForm();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddCategory}
                disabled={submitting || !categoryName.trim()}
              >
                {submitting ? "Creating..." : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategory && selectedCategory && (
        <div className="modal-overlay" onClick={() => setShowEditCategory(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Category</h2>
            <p className="modal-subtitle">Update category details</p>

            <div className="form-group">
              <label>Category Name *</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Category name"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Icon</label>
              <LucideIconPicker
                value={categoryIconName}
                onChange={setCategoryIconName}
                placeholder="Select a category icon..."
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowEditCategory(false);
                  resetCategoryForm();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateCategory}
                disabled={submitting || !categoryName.trim()}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showAddSubcategory && selectedCategory && (
        <div className="modal-overlay" onClick={() => setShowAddSubcategory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Subcategory</h2>
            <p className="modal-subtitle">
              Adding to: <strong>{formatCategoryName(selectedCategory.name)}</strong>
            </p>

            <div className="form-group">
              <label>Subcategory Name *</label>
              <input
                type="text"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="e.g., Tech Meetups, Corporate Training"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={subcategoryDescription}
                onChange={(e) => setSubcategoryDescription(e.target.value)}
                placeholder="Brief description"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Icon</label>
              <LucideIconPicker
                value={subcategoryIconName}
                onChange={setSubcategoryIconName}
                placeholder="Select an icon..."
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddSubcategory(false);
                  resetSubcategoryForm();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddSubcategory}
                disabled={submitting || !subcategoryName.trim()}
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {showEditSubcategory && selectedSubcategory && (
        <div className="modal-overlay" onClick={() => setShowEditSubcategory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Subcategory</h2>

            <div className="form-group">
              <label>Subcategory Name *</label>
              <input
                type="text"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="Subcategory name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={subcategoryDescription}
                onChange={(e) => setSubcategoryDescription(e.target.value)}
                placeholder="Brief description"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Icon</label>
              <LucideIconPicker
                value={subcategoryIconName}
                onChange={setSubcategoryIconName}
                placeholder="Select an icon..."
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowEditSubcategory(false);
                  resetSubcategoryForm();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateSubcategory}
                disabled={submitting || !subcategoryName.trim()}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCategoriesScreen;
