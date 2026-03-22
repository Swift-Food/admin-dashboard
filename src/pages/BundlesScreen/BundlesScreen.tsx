import { useEffect, useState, useRef, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Power,
  Search,
  Package,
} from "lucide-react";
import type {
  BundleType,
  CateringBundle,
  CateringMenuItem,
  CreateCateringBundleItemDto,
} from "../../types/bundles.types";
import {
  getAllBundles,
  createBundle,
  updateBundle,
  deleteBundle,
  toggleBundleActive,
  uploadImage,
} from "../../services/bundles.service";
import { getCateringMenuItems } from "../../services/menuItems.service";
import { getAllRestaurantsAdminDashboard } from "../../services/restaurant.service";
import ImageCropper from "../../components/ImageCropper";
import "./BundlesScreen.css";

interface BundlesScreenProps {
  bundleType: BundleType;
}

interface BundleFormData {
  name: string;
  description: string;
  imageUrl: string;
  pricePerPerson: number;
  baseGuestCount: number;
  restaurantId: string;
  items: CreateCateringBundleItemDto[];
}

interface SimpleRestaurant {
  id: string;
  restaurant_name: string;
}

const emptyForm: BundleFormData = {
  name: "",
  description: "",
  imageUrl: "",
  pricePerPerson: 0,
  baseGuestCount: 0,
  restaurantId: "",
  items: [],
};

const BundlesScreen = ({ bundleType }: BundlesScreenProps) => {
  const [bundles, setBundles] = useState<CateringBundle[]>([]);
  const [menuItems, setMenuItems] = useState<CateringMenuItem[]>([]);
  const [restaurants, setRestaurants] = useState<SimpleRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<CateringBundle | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(
    new Set()
  );
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRestaurant, setFilterRestaurant] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BundleFormData>({ ...emptyForm });

  const isCatering = bundleType === "catering";

  // For catering bundles, filter menu items to selected restaurant
  const filteredMenuItems = useMemo(() => {
    if (!isCatering || !formData.restaurantId) return menuItems;
    return menuItems.filter(
      (mi) => mi.restaurant.id === formData.restaurantId
    );
  }, [menuItems, formData.restaurantId, isCatering]);

  // Get unique restaurants from bundles for filter dropdown
  const bundleRestaurants = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bundles) {
      if (b.restaurantId && b.restaurantName) {
        map.set(b.restaurantId, b.restaurantName);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [bundles]);

  // Filter and group bundles
  const { groupedBundles, filteredCount, totalCount } = useMemo(() => {
    let filtered = bundles;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.restaurantName?.toLowerCase().includes(q)
      );
    }

    // Restaurant filter
    if (filterRestaurant) {
      filtered = filtered.filter((b) => b.restaurantId === filterRestaurant);
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((b) =>
        filterStatus === "active" ? b.isActive : !b.isActive
      );
    }

    // Group by restaurant for catering bundles
    const groups = new Map<string, { name: string; bundles: CateringBundle[] }>();
    if (isCatering) {
      for (const bundle of filtered) {
        const key = bundle.restaurantId || "unassigned";
        const name = bundle.restaurantName || "Unassigned";
        if (!groups.has(key)) {
          groups.set(key, { name, bundles: [] });
        }
        groups.get(key)!.bundles.push(bundle);
      }
    } else {
      // For prismo, single group
      if (filtered.length > 0) {
        groups.set("all", { name: "All Bundles", bundles: filtered });
      }
    }

    return {
      groupedBundles: groups,
      filteredCount: filtered.length,
      totalCount: bundles.length,
    };
  }, [bundles, searchQuery, filterRestaurant, filterStatus, isCatering]);

  useEffect(() => {
    setExpandedBundles(new Set());
    setSearchQuery("");
    setFilterRestaurant("");
    setFilterStatus("all");
    setCollapsedGroups(new Set());
    loadData();
  }, [bundleType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const promises: Promise<any>[] = [
        getAllBundles(bundleType),
        getCateringMenuItems(),
      ];
      if (bundleType === "catering") {
        promises.push(getAllRestaurantsAdminDashboard());
      }
      const results = await Promise.all(promises);
      setBundles(results[0]);
      setMenuItems(results[1]);
      if (results[2]) {
        setRestaurants(
          results[2].map((r: any) => ({
            id: r.id,
            restaurant_name: r.restaurant_name,
          }))
        );
      } else {
        setRestaurants([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const toggleBundleExpanded = (bundleId: string) => {
    const newExpanded = new Set(expandedBundles);
    if (newExpanded.has(bundleId)) {
      newExpanded.delete(bundleId);
    } else {
      newExpanded.add(bundleId);
    }
    setExpandedBundles(newExpanded);
  };

  const toggleGroupCollapsed = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedGroups(newCollapsed);
  };

  const openCreateModal = () => {
    setEditingBundle(null);
    setFormData({ ...emptyForm });
    setShowModal(true);
  };

  const openEditModal = (bundle: CateringBundle) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      description: bundle.description || "",
      imageUrl: bundle.imageUrl || "",
      pricePerPerson: bundle.pricePerPerson ?? 0,
      baseGuestCount: bundle.baseGuestCount ?? 0,
      restaurantId: bundle.restaurantId || "",
      items: bundle.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        selectedAddons: item.selectedAddons || [],
        sortOrder: item.sortOrder,
      })),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBundle(null);
    setFormData({ ...emptyForm });
  };

  const handleToggleActive = async (bundle: CateringBundle) => {
    try {
      const updated = await toggleBundleActive(bundle.id);
      setBundles((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
    } catch (err: any) {
      alert(err.message || "Failed to toggle bundle status");
    }
  };

  const handleToggleAllInGroup = async (groupBundles: CateringBundle[], activate: boolean) => {
    const toToggle = groupBundles.filter((b) => b.isActive !== activate);
    if (toToggle.length === 0) return;

    const action = activate ? "activate" : "deactivate";
    if (!window.confirm(`${activate ? "Activate" : "Deactivate"} ${toToggle.length} bundle${toToggle.length !== 1 ? "s" : ""}?`)) {
      return;
    }

    try {
      const results = await Promise.all(toToggle.map((b) => toggleBundleActive(b.id)));
      setBundles((prev) => {
        const updatedMap = new Map(results.map((r) => [r.id, r]));
        return prev.map((b) => updatedMap.get(b.id) || b);
      });
    } catch (err: any) {
      alert(err.message || `Failed to ${action} bundles`);
      await loadData();
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploading(true);
      setImageToCrop(null);

      const file = new File([croppedBlob], "cropped-image.jpg", {
        type: "image/jpeg",
      });

      const imageUrl = await uploadImage(file);
      setFormData({ ...formData, imageUrl });
    } catch (err: any) {
      alert(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setImageToCrop(null);
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          menuItemId: "",
          quantity: 1,
          selectedAddons: [],
          sortOrder: prev.items.length,
        },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      newItems.forEach((item, i) => {
        item.sortOrder = i;
      });
      return { ...prev, items: newItems };
    });
  };

  const handleItemChange = (index: number, menuItemId: string) => {
    const selectedMenuItem = menuItems.find((mi) => mi.id === menuItemId);
    if (!selectedMenuItem) return;

    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        menuItemId: selectedMenuItem.id,
        selectedAddons: [],
        sortOrder: index,
      };
      return { ...prev, items: newItems };
    });
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        quantity: Math.max(1, quantity),
      };
      return { ...prev, items: newItems };
    });
  };

  const handleRestaurantChange = (restaurantId: string) => {
    setFormData((prev) => ({
      ...prev,
      restaurantId,
      items: [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a bundle name");
      return;
    }

    if ((formData.pricePerPerson || 0) <= 0) {
      alert("Price per person must be greater than 0");
      return;
    }
    if ((formData.baseGuestCount || 0) <= 0) {
      alert("Base guest count must be greater than 0");
      return;
    }

    if (isCatering && !formData.restaurantId) {
      alert("Please select a restaurant");
      return;
    }

    if (formData.items.length === 0) {
      alert("Please add at least one item to the bundle");
      return;
    }

    const invalidItems = formData.items.filter((item) => !item.menuItemId);
    if (invalidItems.length > 0) {
      alert("Please select a menu item for all items");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        type: bundleType,
        name: formData.name,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        pricePerPerson: formData.pricePerPerson,
        baseGuestCount: formData.baseGuestCount,
        ...(isCatering ? { restaurantId: formData.restaurantId } : {}),
        items: formData.items.map((item, i) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          selectedAddons: item.selectedAddons,
          sortOrder: i,
        })),
      };

      if (editingBundle) {
        const { type, restaurantId, ...updatePayload } = payload as any;
        await updateBundle(editingBundle.id, updatePayload);
      } else {
        await createBundle(payload);
      }
      await loadData();
      closeModal();
    } catch (err: any) {
      alert(
        err?.response?.data?.message || err.message || "Failed to save bundle"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bundleId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this bundle? This will mark it as inactive."
      )
    ) {
      return;
    }

    try {
      await deleteBundle(bundleId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete bundle");
    }
  };

  if (loading) {
    return (
      <div className="bundles-screen">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bundles-screen">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  const title = isCatering ? "Catering Bundles" : "Prismo Bundles";
  const subtitle = isCatering
    ? "Manage restaurant-specific catering bundle templates"
    : "Manage premade bundle templates for catering orders";

  return (
    <div className="bundles-screen">
      <div className="bundles-header">
        <div>
          <h1>{title}</h1>
          <p className="bundles-subtitle">{subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={20} />
          Create Bundle
        </button>
      </div>

      {/* Filters bar */}
      {bundles.length > 0 && (
        <div className="bundles-filters">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search bundles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isCatering && (
            <select
              className="filter-select"
              value={filterRestaurant}
              onChange={(e) => setFilterRestaurant(e.target.value)}
            >
              <option value="">All restaurants</option>
              {bundleRestaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <span className="filter-count">
            {filteredCount} of {totalCount} bundles
          </span>
        </div>
      )}

      <div className="bundles-list">
        {bundles.length === 0 ? (
          <div className="empty-state">
            <p>No {isCatering ? "catering" : "prismo"} bundles created yet</p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              Create Your First Bundle
            </button>
          </div>
        ) : filteredCount === 0 ? (
          <div className="empty-state">
            <p>No bundles match your filters</p>
          </div>
        ) : (
          Array.from(groupedBundles.entries()).map(([groupKey, group]) => (
            <div key={groupKey} className="bundle-group">
              {isCatering && (
                <div className="bundle-group-header">
                  <div
                    className="bundle-group-title"
                    onClick={() => toggleGroupCollapsed(groupKey)}
                    style={{ cursor: "pointer", flex: 1 }}
                  >
                    <h2>{group.name}</h2>
                    <span className="bundle-group-count">
                      {group.bundles.length} bundle{group.bundles.length !== 1 ? "s" : ""}
                    </span>
                    {collapsedGroups.has(groupKey) ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronUp size={18} />
                    )}
                  </div>
                  <div className="bundle-group-actions">
                    {group.bundles.some((b) => b.isActive) && (
                      <button
                        className="btn btn-sm btn-toggle-active"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAllInGroup(group.bundles, false);
                        }}
                      >
                        <Power size={13} />
                        Deactivate All
                      </button>
                    )}
                    {group.bundles.some((b) => !b.isActive) && (
                      <button
                        className="btn btn-sm btn-toggle-inactive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAllInGroup(group.bundles, true);
                        }}
                      >
                        <Power size={13} />
                        Activate All
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!collapsedGroups.has(groupKey) && (
                <div className="bundle-group-items">
                  {group.bundles.map((bundle) => (
                    <div
                      key={bundle.id}
                      className={`bundle-card ${!bundle.isActive ? "bundle-card-inactive" : ""}`}
                    >
                      <div className="bundle-card-header">
                        <div
                          className="bundle-card-main"
                          onClick={() => toggleBundleExpanded(bundle.id)}
                        >
                          {bundle.imageUrl ? (
                            <img
                              src={bundle.imageUrl}
                              alt={bundle.name}
                              className="bundle-image"
                            />
                          ) : (
                            <div className="bundle-image bundle-image-placeholder">
                              <Package size={24} color="#9ca3af" />
                            </div>
                          )}
                          <div className="bundle-card-info">
                            <div className="bundle-card-title-row">
                              <h3>{bundle.name}</h3>
                              <span
                                className={`bundle-status ${
                                  bundle.isActive ? "active" : "inactive"
                                }`}
                              >
                                {bundle.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            {bundle.description && (
                              <p className="bundle-description">
                                {bundle.description}
                              </p>
                            )}
                            <div className="bundle-meta">
                              {!isCatering && bundle.restaurantName && (
                                <span className="bundle-restaurant">
                                  {bundle.restaurantName}
                                </span>
                              )}
                              <span className="bundle-price">
                                £{bundle.pricePerPerson}/person
                              </span>
                              <span className="bundle-guests">
                                {bundle.baseGuestCount} guests
                              </span>
                              <span className="bundle-items-count">
                                {bundle.items.length} item{bundle.items.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="bundle-expand-icon">
                            {expandedBundles.has(bundle.id) ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </div>
                        </div>
                        <div className="bundle-card-actions">
                          <button
                            className={`btn btn-sm ${bundle.isActive ? "btn-toggle-active" : "btn-toggle-inactive"}`}
                            onClick={() => handleToggleActive(bundle)}
                            title={bundle.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power size={14} />
                            {bundle.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => openEditModal(bundle)}
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(bundle.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {expandedBundles.has(bundle.id) && (
                        <div className="bundle-items">
                          <div className="items-list">
                            {bundle.items.map((item, index) => (
                              <div key={index} className="bundle-item">
                                <div className="item-number">{index + 1}</div>
                                <div className="item-details">
                                  <span className="item-name">
                                    {item.menuItemName}
                                  </span>
                                  {!isCatering && (
                                    <span className="item-restaurant">
                                      {item.restaurantName}
                                    </span>
                                  )}
                                </div>
                                <div className="item-quantity">
                                  x{item.quantity}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingBundle ? "Edit" : "Create"}{" "}
                {isCatering ? "Catering" : "Prismo"} Bundle
              </h2>
              <button className="btn-icon" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="bundle-form">
              <div className="form-group">
                <label className="form-label">
                  Bundle Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Executive Lunch Package"
                />
              </div>

              {/* Restaurant selector for catering bundles */}
              {isCatering && (
                <div className="form-group">
                  <label className="form-label">
                    Restaurant <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.restaurantId}
                    onChange={(e) => handleRestaurantChange(e.target.value)}
                    disabled={!!editingBundle}
                  >
                    <option value="">Select restaurant...</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.restaurant_name}
                      </option>
                    ))}
                  </select>
                  {editingBundle && (
                    <p className="form-hint">
                      Restaurant cannot be changed after creation
                    </p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Bundle Image</label>
                <div className="image-upload-section">
                  {formData.imageUrl && (
                    <div className="image-preview-container">
                      <img
                        src={formData.imageUrl}
                        alt="Bundle preview"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger image-remove-btn"
                        onClick={() =>
                          setFormData({ ...formData, imageUrl: "" })
                        }
                      >
                        <X size={14} />
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="image-upload-controls">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                      id="bundle-image-upload"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <Upload size={16} />
                          Upload Image
                        </>
                      )}
                    </button>
                    <span className="image-upload-or">or</span>
                    <input
                      type="text"
                      className="form-input image-url-input"
                      value={formData.imageUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, imageUrl: e.target.value })
                      }
                      placeholder="Paste image URL..."
                    />
                  </div>
                  <p className="form-hint">
                    Supported formats: JPEG, PNG, WebP, GIF. Max size: 10MB
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this bundle..."
                  rows={3}
                />
              </div>

              <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Price Per Person (£) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.pricePerPerson}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricePerPerson: parseFloat(e.target.value) || 0,
                        })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Base Guest Count <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.baseGuestCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          baseGuestCount: parseInt(e.target.value) || 0,
                        })
                      }
                      min="1"
                    />
                  </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <h3>Bundle Items</h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleAddItem}
                    disabled={isCatering && !formData.restaurantId}
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                {isCatering && !formData.restaurantId && (
                  <div className="empty-items">
                    <p>Select a restaurant first to add menu items.</p>
                  </div>
                )}

                {(!isCatering || formData.restaurantId) &&
                formData.items.length === 0 ? (
                  <div className="empty-items">
                    <p>
                      No items added yet. Click "Add Item" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="bundle-items-form">
                    {formData.items.map((item, index) => (
                      <div key={index} className="bundle-item-form">
                        <div className="item-form-header">
                          <span className="item-form-number">{index + 1}</span>
                          <button
                            type="button"
                            className="btn-icon btn-danger"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            Menu Item <span className="required">*</span>
                          </label>
                          <select
                            className="form-select"
                            value={item.menuItemId}
                            onChange={(e) =>
                              handleItemChange(index, e.target.value)
                            }
                          >
                            <option value="">Select menu item...</option>
                            {filteredMenuItems.map((menuItem) => (
                              <option key={menuItem.id} value={menuItem.id}>
                                {menuItem.name} - £{menuItem.price} (
                                {menuItem.groupTitle})
                                {!isCatering &&
                                  ` - ${menuItem.restaurant.restaurant_name}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Quantity</label>
                          <input
                            type="number"
                            className="form-input"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemQuantityChange(
                                index,
                                parseInt(e.target.value) || 1
                              )
                            }
                            min="1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? editingBundle
                      ? "Updating..."
                      : "Creating..."
                    : editingBundle
                      ? "Update Bundle"
                      : "Create Bundle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={4 / 3}
        />
      )}
    </div>
  );
};

export default BundlesScreen;
