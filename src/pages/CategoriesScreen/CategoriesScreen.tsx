import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Package,
  FolderOpen,
  X,
  MoveRight,
} from "lucide-react";
import {
  getAllCategories,
  getSubcategoriesByCategory,
  createSubcategory,
  deleteSubcategory,
  addMenuItemsByGroupTitle,
  removeMenuItems,
  moveMenuItems,
  getAllGroupTitles,
  type Category,
  type Subcategory,
  type MenuItem,
} from "../../services/subcategory.service";
import "./CategoriesScreen.css";

const CategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<Record<string, Subcategory[]>>({});
  const [loadingSubcategories, setLoadingSubcategories] = useState<Record<string, boolean>>({});
  const [groupTitles, setGroupTitles] = useState<string[]>([]);

  // Modal states
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [showAddByGroupTitle, setShowAddByGroupTitle] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  // Form states
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [targetSubcategoryId, setTargetSubcategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchGroupTitles();
  }, []);

  const fetchGroupTitles = async () => {
    try {
      const titles = await getAllGroupTitles();
      setGroupTitles(titles);
    } catch (err) {
      console.error("Error fetching group titles:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getAllCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (categoryId: string, force = false) => {
    if (subcategories[categoryId] && !force) return;

    try {
      setLoadingSubcategories((prev) => ({ ...prev, [categoryId]: true }));
      const data = await getSubcategoriesByCategory(categoryId);
      setSubcategories((prev) => ({ ...prev, [categoryId]: data }));
    } catch (err) {
      console.error("Error fetching subcategories:", err);
      setSubcategories((prev) => ({ ...prev, [categoryId]: [] }));
    } finally {
      setLoadingSubcategories((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleExpandCategory = (categoryId: string) => {
    const isExpanding = expandedCategory !== categoryId;
    setExpandedCategory(isExpanding ? categoryId : null);
    setExpandedSubcategory(null);

    if (isExpanding) {
      fetchSubcategories(categoryId);
    }
  };

  const handleExpandSubcategory = (subcategoryId: string) => {
    setExpandedSubcategory(expandedSubcategory === subcategoryId ? null : subcategoryId);
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategoryId || !newSubcategoryName.trim()) return;

    try {
      setSubmitting(true);
      const newSubcat = await createSubcategory({
        name: newSubcategoryName.trim(),
        categoryId: selectedCategoryId,
      });

      setSubcategories((prev) => ({
        ...prev,
        [selectedCategoryId]: [...(prev[selectedCategoryId] || []), newSubcat],
      }));

      setShowAddSubcategory(false);
      setNewSubcategoryName("");
      setSelectedCategoryId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create subcategory");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string, categoryId: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    try {
      await deleteSubcategory(subcategoryId);
      setSubcategories((prev) => ({
        ...prev,
        [categoryId]: prev[categoryId]?.filter((s) => s.id !== subcategoryId) || [],
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete subcategory");
    }
  };

  const handleRemoveMenuItem = async (subcategory: Subcategory, menuItemId: string) => {
    if (!confirm("Remove this item from the subcategory?")) return;

    try {
      const result = await removeMenuItems(subcategory.id, [menuItemId]);

      // Update local state
      const categoryId = subcategory.categoryId;
      setSubcategories((prev) => ({
        ...prev,
        [categoryId]: prev[categoryId]?.map((s) =>
          s.id === subcategory.id ? result.subcategory : s
        ) || [],
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove item");
    }
  };

  const handleAddMenuItemsByGroupTitle = async () => {
    if (!selectedSubcategory || !groupTitle.trim()) return;

    try {
      setSubmitting(true);
      const result = await addMenuItemsByGroupTitle(
        selectedSubcategory.id,
        groupTitle.trim(),
        restaurantId.trim() || undefined
      );

      alert(`Successfully added ${result.added} menu items to "${selectedSubcategory.name}"`);

      // Refresh subcategories to get updated menu items
      const categoryId = selectedSubcategory.categoryId;
      setSubcategories((prev) => ({
        ...prev,
        [categoryId]: prev[categoryId]?.map((s) =>
          s.id === selectedSubcategory.id ? result.subcategory : s
        ) || [],
      }));

      setShowAddByGroupTitle(false);
      setGroupTitle("");
      setRestaurantId("");
      setSelectedSubcategory(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add menu items");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddSubcategoryModal = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setShowAddSubcategory(true);
  };

  const openAddByGroupTitleModal = (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory);
    setShowAddByGroupTitle(true);
  };

  const openMoveModal = (subcategory: Subcategory, menuItem: MenuItem) => {
    setSelectedSubcategory(subcategory);
    setSelectedMenuItem(menuItem);
    setTargetSubcategoryId("");
    setShowMoveModal(true);
  };

  const handleMoveMenuItem = async () => {
    if (!selectedSubcategory || !selectedMenuItem || !targetSubcategoryId) return;

    try {
      setSubmitting(true);
      const result = await moveMenuItems(
        selectedSubcategory.id,
        targetSubcategoryId,
        [selectedMenuItem.id]
      );

      // Update both subcategories in local state
      const fromCategoryId = selectedSubcategory.categoryId;
      setSubcategories((prev) => {
        const updated = { ...prev };

        // Update source subcategory
        updated[fromCategoryId] = updated[fromCategoryId]?.map((s) =>
          s.id === selectedSubcategory.id ? result.fromSubcategory : s
        ) || [];

        // Update target subcategory (might be in a different category)
        const toCategoryId = result.toSubcategory.categoryId;
        if (updated[toCategoryId]) {
          updated[toCategoryId] = updated[toCategoryId].map((s) =>
            s.id === targetSubcategoryId ? result.toSubcategory : s
          );
        }

        return updated;
      });

      setShowMoveModal(false);
      setSelectedSubcategory(null);
      setSelectedMenuItem(null);
      setTargetSubcategoryId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to move item");
    } finally {
      setSubmitting(false);
    }
  };

  // Get all subcategories for the move dropdown (excluding the current one)
  const getAllSubcategoriesForMove = (): Subcategory[] => {
    const allSubcats: Subcategory[] = [];
    Object.values(subcategories).forEach((subs) => {
      subs.forEach((sub) => {
        if (sub.id !== selectedSubcategory?.id) {
          allSubcats.push(sub);
        }
      });
    });
    return allSubcats;
  };

  if (loading) {
    return (
      <div className="categories-loading">
        <div className="spinner"></div>
        <p>Loading categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="categories-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button onClick={fetchCategories} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="categories-container">
      <div className="categories-header">
        <div>
          <h1>Categories & Subcategories</h1>
          <p>Manage menu categories, subcategories, and their items</p>
        </div>
      </div>

      <div className="categories-list">
        {categories.map((category) => (
          <div key={category.id} className="category-card">
            <div
              className="category-header"
              onClick={() => handleExpandCategory(category.id)}
            >
              <div className="category-info">
                {expandedCategory === category.id ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <FolderOpen size={20} className="category-icon" />
                <span className="category-name">{category.name}</span>
                <span className="category-clicks">{category.clicks} clicks</span>
              </div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddSubcategoryModal(category.id);
                }}
              >
                <Plus size={16} /> Add Subcategory
              </button>
            </div>

            {expandedCategory === category.id && (
              <div className="subcategories-container">
                {loadingSubcategories[category.id] ? (
                  <div className="subcategories-loading">
                    <div className="spinner-sm"></div>
                    Loading subcategories...
                  </div>
                ) : subcategories[category.id]?.length === 0 ? (
                  <div className="subcategories-empty">
                    No subcategories yet. Add one to get started.
                  </div>
                ) : (
                  <div className="subcategories-list">
                    {subcategories[category.id]?.map((subcategory) => (
                      <div key={subcategory.id} className="subcategory-wrapper">
                        <div className="subcategory-item">
                          <div
                            className="subcategory-info"
                            onClick={() => handleExpandSubcategory(subcategory.id)}
                            style={{ cursor: "pointer", flex: 1 }}
                          >
                            {expandedSubcategory === subcategory.id ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                            <Package size={16} />
                            <span className="subcategory-name">{subcategory.name}</span>
                            <span className="subcategory-items">
                              {subcategory.menuItems?.length || 0} items
                            </span>
                          </div>
                          <div className="subcategory-actions">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openAddByGroupTitleModal(subcategory)}
                            >
                              <Plus size={14} /> Add Items
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteSubcategory(subcategory.id, category.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Menu Items List */}
                        {expandedSubcategory === subcategory.id && (
                          <div className="menu-items-container">
                            {subcategory.menuItems && subcategory.menuItems.length > 0 ? (
                              <div className="menu-items-list">
                                <div className="menu-items-header">
                                  <span>Item Name</span>
                                  <span>Price</span>
                                  <span>Group</span>
                                  <span>Actions</span>
                                </div>
                                {subcategory.menuItems.map((item: MenuItem) => (
                                  <div key={item.id} className="menu-item-row">
                                    <span className="menu-item-name">{item.name}</span>
                                    <span className="menu-item-price">
                                      £{Number(item.price).toFixed(2)}
                                    </span>
                                    <span className="menu-item-group">
                                      {item.groupTitle || "-"}
                                    </span>
                                    <div className="menu-item-actions">
                                      <button
                                        className="btn btn-xs btn-secondary"
                                        onClick={() => openMoveModal(subcategory, item)}
                                        title="Move to another subcategory"
                                      >
                                        <MoveRight size={14} />
                                      </button>
                                      <button
                                        className="btn btn-xs btn-danger"
                                        onClick={() => handleRemoveMenuItem(subcategory, item.id)}
                                        title="Remove from subcategory"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="menu-items-empty">
                                No items in this subcategory yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Subcategory Modal */}
      {showAddSubcategory && (
        <div className="modal-overlay" onClick={() => setShowAddSubcategory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Subcategory</h2>
            <div className="form-group">
              <label>Subcategory Name</label>
              <input
                type="text"
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                placeholder="e.g., Soft Drinks, Appetizers"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddSubcategory(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddSubcategory}
                disabled={submitting || !newSubcategoryName.trim()}
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add by Group Title Modal */}
      {showAddByGroupTitle && selectedSubcategory && (
        <div className="modal-overlay" onClick={() => setShowAddByGroupTitle(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Menu Items by Group Title</h2>
            <p className="modal-subtitle">
              Adding to: <strong>{selectedSubcategory.name}</strong>
            </p>
            <div className="form-group">
              <label>Group Title *</label>
              <select
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="form-select"
              >
                <option value="">Select a group title...</option>
                {groupTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
              <small>
                This will add all menu items that have this exact groupTitle value
              </small>
            </div>
            <div className="form-group">
              <label>Restaurant ID (optional)</label>
              <input
                type="text"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                placeholder="Leave empty for all restaurants"
              />
              <small>
                Filter to only add items from a specific restaurant
              </small>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddByGroupTitle(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddMenuItemsByGroupTitle}
                disabled={submitting || !groupTitle.trim()}
              >
                {submitting ? "Adding..." : "Add Items"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Menu Item Modal */}
      {showMoveModal && selectedSubcategory && selectedMenuItem && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Move Menu Item</h2>
            <p className="modal-subtitle">
              Moving: <strong>{selectedMenuItem.name}</strong>
              <br />
              From: <strong>{selectedSubcategory.name}</strong>
            </p>
            <div className="form-group">
              <label>Move to Subcategory *</label>
              <select
                value={targetSubcategoryId}
                onChange={(e) => setTargetSubcategoryId(e.target.value)}
                className="form-select"
              >
                <option value="">Select a subcategory...</option>
                {getAllSubcategoriesForMove().map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowMoveModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleMoveMenuItem}
                disabled={submitting || !targetSubcategoryId}
              >
                {submitting ? "Moving..." : "Move Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesScreen;
