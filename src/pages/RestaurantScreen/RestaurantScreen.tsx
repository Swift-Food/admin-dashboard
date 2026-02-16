import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Plus,
  Save,
  Edit2,
  X,
  MapPin,
  ExternalLink,
  Trash2,
} from "lucide-react";

import {
  getAllRestaurantsAdminDashboard,
  updateRestaurantStatus,
  updateRestaurant,
  deleteRestaurant,
  uploadRestaurantImage,
} from "../../services/restaurant.service";
import type { RestaurantResponse, UpdateRestaurantDto } from "../../services/restaurant.service";

import { AddRestaurantModal } from "../../components/AddRestaurantModal";
import ImageCropper from "../../components/ImageCropper/ImageCropper";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import CateringImageUpload from "../../components/CateringImageUpload";
import "./RestaurantScreen.css";

const RestaurantAdminDashboard = () => {
  const [restaurants, setRestaurants] = useState<RestaurantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateRestaurantDto>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalRestaurant, setDeleteModalRestaurant] = useState<RestaurantResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Image upload state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getAllRestaurantsAdminDashboard();
      setRestaurants(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      setUpdatingId(id);
      await updateRestaurantStatus(id, status);
      setRestaurants(
        restaurants.map((r) => (r.id === id ? { ...r, status: status as any } : r))
      );
    } catch (err) {
      alert(
        `Error: ${err instanceof Error ? err.message : "An error occurred"}`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExpandRestaurant = (restaurantId: string) => {
    setExpandedId(expandedId === restaurantId ? null : restaurantId);
  };

  const handleRestaurantCreated = () => {
    fetchRestaurants();
  };

  const startEditing = (restaurant: RestaurantResponse) => {
    setEditingId(restaurant.id);
    setEditForm({
      restaurant_name: restaurant.restaurant_name,
      restaurant_description: restaurant.restaurant_description || "",
      commission: restaurant.commission ?? 20,
      fsa: restaurant.fsa ?? undefined,
      fsaLink: restaurant.fsaLink || "",
      status: restaurant.status ?? "inactive",
      images: restaurant.images?.[0] || "",
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
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
    e.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploadingImage(true);
      setImageToCrop(null);

      const file = new File([croppedBlob], "catering-image.jpg", {
        type: "image/jpeg",
      });

      const imageUrl = await uploadRestaurantImage(file);
      setEditForm({ ...editForm, images: imageUrl });
    } catch (err) {
      alert(`Failed to upload image: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCropCancel = () => {
    setImageToCrop(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveChanges = async (restaurantId: string) => {
    try {
      setSavingId(restaurantId);

      // Prepare payload - convert images string to array for API
      const { images: imageStr, ...restForm } = editForm;
      const payload = {
        ...restForm,
        images: imageStr ? [imageStr] : [],  // Empty array to clear images
      };
      await updateRestaurant(restaurantId, payload as any);

      // Update local state
      setRestaurants(
        restaurants.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                ...restForm,
                // Convert images string back to array for local state
                images: imageStr ? [imageStr] : [],
              }
            : r
        )
      );

      setEditingId(null);
      setEditForm({});
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to update restaurant"}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!deleteModalRestaurant) return;

    try {
      setDeletingId(deleteModalRestaurant.id);
      await deleteRestaurant(deleteModalRestaurant.id);
      setRestaurants(restaurants.filter((r) => r.id !== deleteModalRestaurant.id));
      setDeleteModalRestaurant(null);
      if (expandedId === deleteModalRestaurant.id) {
        setExpandedId(null);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to delete restaurant"}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-header">
            <AlertCircle className="error-icon" size={24} />
            <div>
              <h3 className="error-title">Error Loading Data</h3>
              <p className="error-message">{error}</p>
            </div>
          </div>
          <button onClick={fetchRestaurants} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Restaurant Management</h1>
            <p className="dashboard-subtitle">
              Manage restaurant availability and settings
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-open flex items-center gap-2"
            style={{ marginLeft: "auto" }}
          >
            <Plus size={20} />
            Add Restaurant
          </button>
        </div>

        <div className="table-container">
          <div className="table-wrapper">
            <table className="restaurants-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((restaurant) => (
                  <React.Fragment key={restaurant.id}>
                    <tr className="restaurant-row">
                      <td>
                        <div>
                          <div className="restaurant-name">
                            {restaurant.restaurant_name}
                          </div>
                          {restaurant.featured && (
                            <span className="featured-badge">Featured</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`type-badge status-badge-${restaurant.status}`}>
                          {restaurant.status === 'active' ? 'Active' : restaurant.status === 'inactive' ? 'Inactive' : 'Coming Soon'}
                        </span>
                      </td>
                      <td className="contact-cell">
                        <div>{restaurant.phoneNumber || "N/A"}</div>
                        <div className="contact-email">
                          {restaurant.email || "N/A"}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <select
                            value={restaurant.status}
                            onChange={(e) =>
                              handleStatusChange(restaurant.id, e.target.value)
                            }
                            disabled={updatingId === restaurant.id}
                            className={`status-select status-select-${restaurant.status}`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="coming_soon">Coming Soon</option>
                          </select>
                          {updatingId === restaurant.id && (
                            <div className="btn-spinner"></div>
                          )}
                          <button
                            onClick={() =>
                              handleExpandRestaurant(restaurant.id)
                            }
                            className="btn btn-details"
                          >
                            {expandedId === restaurant.id ? "Hide" : "Show"}{" "}
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === restaurant.id && (
                      <tr>
                        <td colSpan={4} className="expanded-cell">
                          <div className="expanded-content">
                            {/* Restaurant Settings Section */}
                            <div className="settings-section">
                              <div className="section-header">
                                <h3 className="section-title">Restaurant Settings</h3>
                                {editingId === restaurant.id ? (
                                  <div className="edit-actions">
                                    <button
                                      onClick={cancelEditing}
                                      className="btn btn-cancel-edit"
                                      disabled={savingId === restaurant.id}
                                    >
                                      <X size={16} />
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => saveChanges(restaurant.id)}
                                      className="btn btn-save"
                                      disabled={savingId === restaurant.id}
                                    >
                                      {savingId === restaurant.id ? (
                                        <>
                                          <div className="btn-spinner"></div>
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Save size={16} />
                                          Save Changes
                                        </>
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => startEditing(restaurant)}
                                    className="btn btn-edit"
                                  >
                                    <Edit2 size={16} />
                                    Edit Settings
                                  </button>
                                )}
                              </div>

                              {editingId === restaurant.id ? (
                                <div className="edit-form">
                                  <div className="edit-form-grid">
                                    <div className="form-field">
                                      <label className="field-label">Restaurant Name</label>
                                      <input
                                        type="text"
                                        value={editForm.restaurant_name || ""}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, restaurant_name: e.target.value })
                                        }
                                        className="form-input"
                                      />
                                    </div>

                                    <div className="form-field">
                                      <label className="field-label">
                                        Commission Rate (%)
                                        <span className="field-hint">Platform fee percentage</span>
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={editForm.commission ?? 20}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, commission: parseFloat(e.target.value) || 0 })
                                        }
                                        className="form-input"
                                      />
                                    </div>

                                    <div className="form-field">
                                      <label className="field-label">FSA Rating</label>
                                      <select
                                        value={editForm.fsa ?? ""}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, fsa: e.target.value ? parseInt(e.target.value) : undefined })
                                        }
                                        className="form-input"
                                      >
                                        <option value="">Not Set</option>
                                        <option value="5">5 - Very Good</option>
                                        <option value="4">4 - Good</option>
                                        <option value="3">3 - Generally Satisfactory</option>
                                        <option value="2">2 - Improvement Necessary</option>
                                        <option value="1">1 - Major Improvement Necessary</option>
                                        <option value="0">0 - Urgent Improvement Necessary</option>
                                      </select>
                                    </div>

                                    <div className="form-field">
                                      <label className="field-label">FSA Link</label>
                                      <input
                                        type="url"
                                        value={editForm.fsaLink || ""}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, fsaLink: e.target.value })
                                        }
                                        className="form-input"
                                        placeholder="https://ratings.food.gov.uk/..."
                                      />
                                    </div>

                                    <div className="form-field">
                                      <label className="field-label">Status</label>
                                      <select
                                        value={editForm.status ?? "inactive"}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, status: e.target.value as "active" | "inactive" | "coming_soon" })
                                        }
                                        className="form-input"
                                      >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="coming_soon">Coming Soon</option>
                                      </select>
                                    </div>

                                    <div className="form-field full-width">
                                      <label className="field-label">Description</label>
                                      <textarea
                                        value={editForm.restaurant_description || ""}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, restaurant_description: e.target.value })
                                        }
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="Restaurant description..."
                                      />
                                    </div>

                                    {restaurant.isCatering && (
                                      <div className="form-field full-width">
                                        <label className="field-label">
                                          Catering Image
                                          <span className="field-hint">Image shown on catering menu</span>
                                        </label>
                                        <CateringImageUpload
                                          imageUrl={editForm.images}
                                          isUploading={uploadingImage}
                                          onImageSelect={handleImageSelect}
                                          onImageRemove={() => setEditForm({ ...editForm, images: "" })}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="settings-display">
                                  <div className="settings-grid">
                                    <div className="setting-item highlight">
                                      <span className="setting-label">Commission</span>
                                      <span className="setting-value commission-value">
                                        {restaurant.commission ?? 20}%
                                      </span>
                                    </div>
                                    <div className="setting-item">
                                      <span className="setting-label">FSA Rating</span>
                                      <span className="setting-value">
                                        {restaurant.fsa !== undefined && restaurant.fsa !== null
                                          ? `${restaurant.fsa}/5`
                                          : "N/A"}
                                        {restaurant.fsaLink && (
                                          <a
                                            href={restaurant.fsaLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="fsa-link"
                                          >
                                            <ExternalLink size={12} />
                                          </a>
                                        )}
                                      </span>
                                    </div>
                                    {restaurant.isCatering && (
                                      <div className="setting-item">
                                        <span className="setting-label">Catering</span>
                                        <span className="setting-value badge-yes">Enabled</span>
                                      </div>
                                    )}
                                  </div>

                                  {restaurant.isCatering && restaurant.images?.[0] && (
                                    <div className="catering-image-display">
                                      <span className="setting-label">Catering Image</span>
                                      <img
                                        src={restaurant.images[0]}
                                        alt="Catering"
                                        className="catering-display-img"
                                      />
                                    </div>
                                  )}

                                  {restaurant.restaurant_description && (
                                    <div className="description-display">
                                      <span className="setting-label">Description</span>
                                      <p className="description-text">{restaurant.restaurant_description}</p>
                                    </div>
                                  )}

                                  {restaurant.address && (
                                    <div className="address-display">
                                      <MapPin size={14} />
                                      <span>
                                        {restaurant.address.addressLine1}
                                        {restaurant.address.addressLine2 && `, ${restaurant.address.addressLine2}`}
                                        {restaurant.address.city && `, ${restaurant.address.city}`}
                                        {restaurant.address.zipcode && ` ${restaurant.address.zipcode}`}
                                      </span>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => setDeleteModalRestaurant(restaurant)}
                                    className="btn btn-delete-restaurant"
                                  >
                                    <Trash2 size={16} />
                                    Delete Restaurant
                                  </button>
                                </div>
                              )}
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

        {restaurants.length === 0 && (
          <div className="empty-state">
            <p>No restaurants found</p>
          </div>
        )}
      </div>

      <AddRestaurantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRestaurantCreated}
      />

      <DeleteConfirmModal
        isOpen={!!deleteModalRestaurant}
        title="Delete Restaurant"
        itemName={deleteModalRestaurant?.restaurant_name || ""}
        description="This action cannot be undone. All associated data including orders and menu items will be permanently deleted."
        isDeleting={!!deletingId}
        onConfirm={handleDeleteRestaurant}
        onCancel={() => setDeleteModalRestaurant(null)}
      />

      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        />
      )}
    </div>
  );
};

export default RestaurantAdminDashboard;
