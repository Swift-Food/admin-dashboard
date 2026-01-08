import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, X, Upload } from "lucide-react";
import type {
  CateringBundle,
  CateringBundleItem,
  CateringMenuItem,
} from "../../types/bundles.types";
import {
  getAllBundles,
  createBundle,
  updateBundle,
  deleteBundle,
  uploadImage,
} from "../../services/bundles.service";
import { getCateringMenuItems } from "../../services/menuItems.service";
import ImageCropper from "../../components/ImageCropper";
import "./BundlesScreen.css";

interface BundleFormData {
  name: string;
  description: string;
  imageUrl: string;
  pricePerPerson: number;
  baseGuestCount: number;
  items: Omit<CateringBundleItem, "id">[];
}

const BundlesScreen = () => {
  const [bundles, setBundles] = useState<CateringBundle[]>([]);
  const [menuItems, setMenuItems] = useState<CateringMenuItem[]>([]);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BundleFormData>({
    name: "",
    description: "",
    imageUrl: "",
    pricePerPerson: 0,
    baseGuestCount: 10,
    items: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bundlesData, menuItemsData] = await Promise.all([
        getAllBundles(),
        getCateringMenuItems(),
      ]);
      setBundles(bundlesData);
      setMenuItems(menuItemsData);
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

  const openCreateModal = () => {
    setEditingBundle(null);
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      pricePerPerson: 0,
      baseGuestCount: 10,
      items: [],
    });
    setShowModal(true);
  };

  const openEditModal = (bundle: CateringBundle) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      description: bundle.description || "",
      imageUrl: bundle.imageUrl || "",
      pricePerPerson: bundle.pricePerPerson,
      baseGuestCount: bundle.baseGuestCount,
      items: bundle.items.map((item) => ({
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
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
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      pricePerPerson: 0,
      baseGuestCount: 10,
      items: [],
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size must be less than 10MB");
      return;
    }

    // Create a data URL to show in the cropper
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploading(true);
      setImageToCrop(null);

      // Convert blob to file for upload
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
          restaurantId: "",
          restaurantName: "",
          menuItemId: "",
          menuItemName: "",
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
      // Update sort order
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
        menuItemName: selectedMenuItem.name,
        restaurantId: selectedMenuItem.restaurant.id,
        restaurantName: selectedMenuItem.restaurant.restaurant_name,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a bundle name");
      return;
    }

    if (formData.pricePerPerson <= 0) {
      alert("Price per person must be greater than 0");
      return;
    }

    if (formData.baseGuestCount <= 0) {
      alert("Base guest count must be greater than 0");
      return;
    }

    if (formData.items.length === 0) {
      alert("Please add at least one item to the bundle");
      return;
    }

    // Validate all items have menu items selected
    const invalidItems = formData.items.filter((item) => !item.menuItemId);
    if (invalidItems.length > 0) {
      alert("Please select a menu item for all items");
      return;
    }

    try {
      setSubmitting(true);
      if (editingBundle) {
        await updateBundle(editingBundle.id, formData);
      } else {
        await createBundle(formData);
      }
      await loadData();
      closeModal();
    } catch (err: any) {
      alert(err.message || "Failed to save bundle");
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

  return (
    <div className="bundles-screen">
      <div className="bundles-header">
        <div>
          <h1>Catering Bundles</h1>
          <p className="bundles-subtitle">
            Manage premade bundle templates for catering orders
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={20} />
          Create Bundle
        </button>
      </div>

      <div className="bundles-list">
        {bundles.length === 0 ? (
          <div className="empty-state">
            <p>No bundles created yet</p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              Create Your First Bundle
            </button>
          </div>
        ) : (
          bundles.map((bundle) => (
            <div key={bundle.id} className="bundle-card">
              <div className="bundle-card-header">
                <div className="bundle-card-main">
                  <div className="bundle-card-info">
                    {bundle.imageUrl && (
                      <img
                        src={bundle.imageUrl}
                        alt={bundle.name}
                        className="bundle-image"
                      />
                    )}
                    <div>
                      <h3>{bundle.name}</h3>
                      {bundle.description && (
                        <p className="bundle-description">
                          {bundle.description}
                        </p>
                      )}
                      <div className="bundle-meta">
                        <span className="bundle-price">
                          ${bundle.pricePerPerson}/person
                        </span>
                        <span className="bundle-guests">
                          Base: {bundle.baseGuestCount} guests
                        </span>
                        <span
                          className={`bundle-status ${
                            bundle.isActive ? "active" : "inactive"
                          }`}
                        >
                          {bundle.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => toggleBundleExpanded(bundle.id)}
                  >
                    {expandedBundles.has(bundle.id) ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                </div>
                <div className="bundle-card-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEditModal(bundle)}
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(bundle.id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {expandedBundles.has(bundle.id) && (
                <div className="bundle-items">
                  <h4>Items ({bundle.items.length})</h4>
                  <div className="items-list">
                    {bundle.items.map((item, index) => (
                      <div key={index} className="bundle-item">
                        <div className="item-number">{index + 1}</div>
                        <div className="item-details">
                          <div className="item-name">{item.menuItemName}</div>
                          <div className="item-restaurant">
                            {item.restaurantName}
                          </div>
                        </div>
                        <div className="item-quantity">Qty: {item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBundle ? "Edit Bundle" : "Create Bundle"}</h2>
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
                        onClick={() => setFormData({ ...formData, imageUrl: "" })}
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
                    Price Per Person ($) <span className="required">*</span>
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
                        baseGuestCount: parseInt(e.target.value) || 10,
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
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <div className="empty-items">
                    <p>No items added yet. Click "Add Item" to get started.</p>
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
                            onChange={(e) => handleItemChange(index, e.target.value)}
                          >
                            <option value="">Select menu item...</option>
                            {menuItems.map((menuItem) => (
                              <option key={menuItem.id} value={menuItem.id}>
                                {menuItem.name} - ${menuItem.price} (
                                {menuItem.groupTitle}) - {menuItem.restaurant.restaurant_name}
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
