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
  updateRestaurantVatNumber,
  deleteRestaurant,
  uploadRestaurantImage,
} from "../../services/restaurant.service";
import http from "../../services/http";
import type { RestaurantResponse, UpdateRestaurantDto } from "../../services/restaurant.service";
import { updateAddress } from "../../services/address.service";

import { AddRestaurantModal } from "../../components/AddRestaurantModal";
import ImageCropper from "../../components/ImageCropper/ImageCropper";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import CateringImageUpload from "../../components/CateringImageUpload";
import GooglePlacesAutocomplete from "../../components/GooglePlacesAutocomplete/GooglePlacesAutocomplete";
import type { PlaceResult } from "../../components/GooglePlacesAutocomplete/GooglePlacesAutocomplete";
import "./RestaurantScreen.css";

const formatCateringHoursTime = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const formatCateringHours = (
  cateringOperatingHours: RestaurantResponse["cateringOperatingHours"]
): string => {
  if (!cateringOperatingHours || cateringOperatingHours.length === 0) {
    return "Not set";
  }

  const enabledDays = cateringOperatingHours.filter((schedule) => schedule.enabled);
  if (enabledDays.length === 0) {
    return "No hours set";
  }

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const byDay = new Map<string, string[]>();

  for (const schedule of enabledDays) {
    const dayKey = schedule.day.toLowerCase();
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    if (schedule.open && schedule.close) {
      byDay.get(dayKey)!.push(
        `${formatCateringHoursTime(schedule.open)} - ${formatCateringHoursTime(schedule.close)}`
      );
    }
  }

  const grouped: { days: string[]; hours: string }[] = [];
  for (const dayKey of dayOrder) {
    const slots = byDay.get(dayKey);
    if (!slots || slots.length === 0) continue;
    const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1, 3);
    const hours = slots.join(", ");
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.hours === hours) {
      lastGroup.days.push(dayName);
    } else {
      grouped.push({ days: [dayName], hours });
    }
  }

  return grouped
    .map((group) => {
      const dayRange =
        group.days.length > 1
          ? `${group.days[0]} - ${group.days[group.days.length - 1]}`
          : group.days[0];
      return `${dayRange}: ${group.hours}`;
    })
    .join(" | ");
};

const HOURS_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type HoursDay = (typeof HOURS_DAYS)[number];

interface HoursSlot {
  open: string;
  close: string;
}

interface HoursDaySchedule {
  enabled: boolean;
  slots: HoursSlot[];
}

const generateHoursTimeOptions = (): { label: string; value: string }[] => {
  const times: { label: string; value: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      times.push({ label: formatCateringHoursTime(value), value });
    }
  }
  return times;
};

const HOURS_TIME_OPTIONS = generateHoursTimeOptions();

const createDefaultHoursSchedule = (): Record<HoursDay, HoursDaySchedule> => {
  const schedule: Record<string, HoursDaySchedule> = {};
  for (const day of HOURS_DAYS) {
    schedule[day] = { enabled: false, slots: [] };
  }
  return schedule as Record<HoursDay, HoursDaySchedule>;
};

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

  // VAT number is stored + saved via a dedicated endpoint, so track it
  // separately from the rest of the form.
  const [editVatNumber, setEditVatNumber] = useState<string>("");
  const [originalVatNumber, setOriginalVatNumber] = useState<string>("");

  // Catering hours editing state - kept separate from editForm since it's a
  // day-by-day structure, converted to the flat cateringOperatingHours array
  // only when saving.
  const [hoursSchedule, setHoursSchedule] = useState<Record<HoursDay, HoursDaySchedule>>(
    createDefaultHoursSchedule()
  );
  const [hoursEditorExpanded, setHoursEditorExpanded] = useState(false);

  // Delete modal state
  const [deleteModalRestaurant, setDeleteModalRestaurant] = useState<RestaurantResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Address edit state
  const [pendingAddress, setPendingAddress] = useState<PlaceResult | null>(null);

  // Image upload state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Logo upload state
  const [logoImageToCrop, setLogoImageToCrop] = useState<string | null>(null);
  const [uploadingLogoImage, setUploadingLogoImage] = useState(false);

  const [monthlyOrderCounts, setMonthlyOrderCounts] = useState<Record<string, number | null>>({});
  const isEditingShowOnSite = editForm.showOnSite ?? true;

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getAllRestaurantsAdminDashboard();
      setRestaurants(data);
      setError(null);

      // Fetch monthly order counts for all restaurants in parallel
      const counts: Record<string, number | null> = {};
      await Promise.all(
        data.map(async (r) => {
          try {
            const res = await http.get<any>(`restaurant-analytics/${r.id}/dashboard`);
            counts[r.id] = res.data?.thisMonth?.totalOrdersCount ?? null;
          } catch {
            counts[r.id] = null;
          }
        })
      );
      setMonthlyOrderCounts(counts);
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
      showOnSite: restaurant.showOnSite ?? true,
      featured: restaurant.featured ?? false,
      fsa: restaurant.fsa ?? undefined,
      fsaLink: restaurant.fsaLink || "",
      status: restaurant.status ?? "inactive",
      images: restaurant.images?.[0] || "",
      logoImageUrl: restaurant.logoImageUrl || "",
      priceRange: restaurant.priceRange || "",
      tags: restaurant.tags || [],
    });
    setEditVatNumber(restaurant.vatNumber || "");
    setOriginalVatNumber(restaurant.vatNumber || "");

    const newSchedule = createDefaultHoursSchedule();
    const existingHours = restaurant.cateringOperatingHours;
    if (existingHours && Array.isArray(existingHours)) {
      for (const entry of existingHours) {
        const dayKey = HOURS_DAYS.find((d) => d.toLowerCase() === entry.day.toLowerCase());
        if (!dayKey) continue;
        if (entry.enabled && entry.open && entry.close) {
          newSchedule[dayKey].enabled = true;
          newSchedule[dayKey].slots.push({ open: entry.open, close: entry.close });
        }
      }
      // Ensure enabled days with no valid slots still show as enabled with one default slot
      for (const day of HOURS_DAYS) {
        if (newSchedule[day].enabled && newSchedule[day].slots.length === 0) {
          newSchedule[day].slots.push({ open: "09:00", close: "17:00" });
        }
      }
    }
    setHoursSchedule(newSchedule);
    setHoursEditorExpanded(false);
  };

  const toggleHoursDay = (day: HoursDay) => {
    setHoursSchedule((prev) => {
      const current = prev[day];
      if (current.enabled) {
        return { ...prev, [day]: { enabled: false, slots: [] } };
      }
      return { ...prev, [day]: { enabled: true, slots: [{ open: "09:00", close: "17:00" }] } };
    });
  };

  const addHoursSlot = (day: HoursDay) => {
    setHoursSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], slots: [...prev[day].slots, { open: "09:00", close: "17:00" }] },
    }));
  };

  const removeHoursSlot = (day: HoursDay, slotIndex: number) => {
    setHoursSchedule((prev) => {
      const newSlots = prev[day].slots.filter((_, i) => i !== slotIndex);
      return { ...prev, [day]: { enabled: newSlots.length > 0, slots: newSlots } };
    });
  };

  const updateHoursSlot = (day: HoursDay, slotIndex: number, field: "open" | "close", value: string) => {
    setHoursSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) => (i === slotIndex ? { ...slot, [field]: value } : slot)),
      },
    }));
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

  const handleLogoImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setLogoImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLogoCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploadingLogoImage(true);
      setLogoImageToCrop(null);

      const file = new File([croppedBlob], "logo-image.jpg", {
        type: "image/jpeg",
      });

      const imageUrl = await uploadRestaurantImage(file);
      setEditForm({ ...editForm, logoImageUrl: imageUrl });
    } catch (err) {
      alert(`Failed to upload logo: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploadingLogoImage(false);
    }
  };

  const handleLogoCropCancel = () => {
    setLogoImageToCrop(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
    setPendingAddress(null);
    setHoursSchedule(createDefaultHoursSchedule());
  };

  const saveChanges = async (restaurantId: string) => {
    // Validate operating hours before saving - closing time must be after opening time
    for (const day of HOURS_DAYS) {
      const dayData = hoursSchedule[day];
      if (!dayData.enabled) continue;
      for (const slot of dayData.slots) {
        if (slot.close <= slot.open) {
          alert(`${day}: closing time must be after opening time for each slot`);
          return;
        }
      }
    }

    try {
      setSavingId(restaurantId);

      // Save address if changed
      if (pendingAddress) {
        const restaurant = restaurants.find((r) => r.id === restaurantId);
        if (restaurant?.address?.id) {
          await updateAddress(restaurant.address.id, {
            addressLine1: pendingAddress.addressLine1,
            addressLine2: pendingAddress.addressLine2,
            city: pendingAddress.city,
            zipcode: pendingAddress.zipcode,
            location: pendingAddress.location,
          });
        }
      }

      // Build cateringOperatingHours from the day-by-day schedule editor
      const cateringOperatingHours: { day: string; open: string | null; close: string | null; enabled: boolean }[] = [];
      for (const day of HOURS_DAYS) {
        const dayData = hoursSchedule[day];
        if (dayData.enabled && dayData.slots.length > 0) {
          for (const slot of dayData.slots) {
            cateringOperatingHours.push({ day, open: slot.open, close: slot.close, enabled: true });
          }
        } else {
          cateringOperatingHours.push({ day, open: null, close: null, enabled: false });
        }
      }

      // Prepare payload - convert images string to array for API
      const { images: imageStr, ...restForm } = editForm;
      const payload = {
        ...restForm,
        images: imageStr ? [imageStr] : [],  // Empty array to clear images
        cateringOperatingHours,
      };
      await updateRestaurant(restaurantId, payload as any);

      // Save VAT number via dedicated endpoint if it changed
      const normalisedVat = editVatNumber.replace(/\s+/g, "").toUpperCase();
      const normalisedOriginal = (originalVatNumber || "").replace(/\s+/g, "").toUpperCase();
      let vatUpdate: { vatNumber: string | null; vatNumberAddedAt: string | null } | null = null;
      if (normalisedVat !== normalisedOriginal) {
        if (normalisedVat && !/^GB\d{9}$/.test(normalisedVat)) {
          throw new Error(
            "VAT number must be in UK format (GB followed by 9 digits), or empty to clear",
          );
        }
        vatUpdate = await updateRestaurantVatNumber(
          restaurantId,
          normalisedVat || null,
        );
      }

      // Update local state
      setRestaurants(
        restaurants.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                ...restForm,
                cateringOperatingHours,
                ...(vatUpdate ? {
                  vatNumber: vatUpdate.vatNumber,
                  vatNumberAddedAt: vatUpdate.vatNumberAddedAt,
                } : {}),
                images: imageStr ? [imageStr] : [],
                ...(pendingAddress && r.address
                  ? {
                      address: {
                        ...r.address,
                        addressLine1: pendingAddress.addressLine1,
                        addressLine2: pendingAddress.addressLine2,
                        city: pendingAddress.city,
                        zipcode: pendingAddress.zipcode,
                        location: pendingAddress.location,
                      },
                    }
                  : {}),
              }
            : r
        )
      );

      setEditingId(null);
      setEditForm({});
      setPendingAddress(null);
      setHoursSchedule(createDefaultHoursSchedule());
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
                  <th>Orders This Month</th>
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
                          {restaurant.featured ? <span className="featured-badge">Featured</span> : null}
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
                        </div>
                      </td>
                      <td className="contact-cell">
                        <div>{restaurant.phoneNumber || "N/A"}</div>
                        <div className="contact-email">
                          {restaurant.email || "N/A"}
                        </div>
                      </td>
                      <td className="contact-cell">
                        {!(restaurant.id in monthlyOrderCounts) ? (
                          <span className="text-gray-400 text-sm">—</span>
                        ) : monthlyOrderCounts[restaurant.id] === null ? (
                          <span className="text-gray-400 text-sm">N/A</span>
                        ) : (
                          <span className="font-semibold text-gray-900">{monthlyOrderCounts[restaurant.id]}</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            handleExpandRestaurant(restaurant.id)
                          }
                          className="btn btn-details"
                        >
                          {expandedId === restaurant.id ? "Hide" : "Show"}{" "}
                          Details
                        </button>
                      </td>
                    </tr>
                    {expandedId === restaurant.id && (
                      <tr>
                        <td colSpan={5} className="expanded-cell">
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
                                      <label className="field-label">
                                        VAT Number
                                        <span className="field-hint">UK format: GB followed by 9 digits. Leave blank if not VAT-registered.</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={editVatNumber}
                                        onChange={(e) => setEditVatNumber(e.target.value)}
                                        placeholder="GB123456789"
                                        className="form-input"
                                        maxLength={20}
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
                                      <label className="field-label">Price Range</label>
                                      <select
                                        value={editForm.priceRange ?? ""}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, priceRange: e.target.value || undefined })
                                        }
                                        className="form-input"
                                      >
                                        <option value="">Not set</option>
                                        <option value="Budget">Budget</option>
                                        <option value="Moderate">Moderate</option>
                                        <option value="Premium">Premium</option>
                                        <option value="Luxury">Luxury</option>
                                      </select>
                                    </div>

                                    <div className="form-field full-width">
                                      <label className="field-label">
                                        Tags
                                        <span className="field-hint">Up to 5 tags</span>
                                      </label>
                                      <div className="tags-input-container">
                                        {(editForm.tags || []).map((tag, i) => (
                                          <span key={i} className="tag-chip">
                                            {tag}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newTags = (editForm.tags || []).filter((_, idx) => idx !== i);
                                                setEditForm({ ...editForm, tags: newTags });
                                              }}
                                              className="tag-chip-remove"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                        {(editForm.tags || []).length < 5 && (
                                          <input
                                            type="text"
                                            className="tag-input"
                                            placeholder="Add tag, press Enter"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" || e.key === ",") {
                                                e.preventDefault();
                                                const val = e.currentTarget.value.trim();
                                                if (val && (editForm.tags || []).length < 5) {
                                                  setEditForm({ ...editForm, tags: [...(editForm.tags || []), val] });
                                                  e.currentTarget.value = "";
                                                }
                                              }
                                            }}
                                          />
                                        )}
                                      </div>
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

                                    <div className="form-field">
                                      <label className="field-label">
                                        Visibility
                                        <span className="field-hint">
                                          Show this restaurant on the site
                                        </span>
                                      </label>
                                      <label className="checkbox-label restaurant-type-toggle">
                                        <input
                                          type="checkbox"
                                          checked={isEditingShowOnSite}
                                          onChange={(e) =>
                                            setEditForm({
                                              ...editForm,
                                              showOnSite: e.target.checked,
                                            })
                                          }
                                          className="form-checkbox"
                                        />
                                        <span className="checkbox-label-text">
                                          Show on site
                                        </span>
                                      </label>
                                    </div>

                                    <div className="form-field">
                                      <label className="field-label">
                                        Featured
                                        <span className="field-hint">
                                          Show this restaurant first in the catering browse list
                                        </span>
                                      </label>
                                      <label className="checkbox-label restaurant-type-toggle">
                                        <input
                                          type="checkbox"
                                          checked={editForm.featured ?? false}
                                          onChange={(e) =>
                                            setEditForm({
                                              ...editForm,
                                              featured: e.target.checked,
                                            })
                                          }
                                          className="form-checkbox"
                                        />
                                        <span className="checkbox-label-text">
                                          Featured restaurant
                                        </span>
                                      </label>
                                    </div>

                                    <div className="form-field full-width">
                                      <div className="hours-editor-header">
                                        <label className="field-label">
                                          Catering Hours
                                          <span className="field-hint">
                                            Weekly schedule used for catering ordering availability
                                          </span>
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => setHoursEditorExpanded((prev) => !prev)}
                                          className="hours-editor-toggle"
                                        >
                                          {hoursEditorExpanded ? "Collapse" : "Edit Hours"}
                                        </button>
                                      </div>
                                      {!hoursEditorExpanded && (
                                        <p className="hours-editor-summary">
                                          {formatCateringHours(restaurant.cateringOperatingHours)}
                                        </p>
                                      )}
                                      {hoursEditorExpanded ? <div className="hours-editor">
                                        {HOURS_DAYS.map((day) => {
                                          const dayData = hoursSchedule[day];
                                          return (
                                            <div key={day} className="hours-editor-day">
                                              <div className="hours-editor-day-header">
                                                <label className="checkbox-label restaurant-type-toggle">
                                                  <input
                                                    type="checkbox"
                                                    checked={dayData.enabled}
                                                    onChange={() => toggleHoursDay(day)}
                                                    className="form-checkbox"
                                                  />
                                                  <span className="checkbox-label-text">{day}</span>
                                                </label>
                                                {dayData.enabled ? <button
                                                    type="button"
                                                    onClick={() => addHoursSlot(day)}
                                                    className="hours-editor-add-slot"
                                                  >
                                                    + Add slot
                                                  </button> : null}
                                              </div>
                                              {!dayData.enabled && (
                                                <p className="hours-editor-closed">Closed</p>
                                              )}
                                              {dayData.enabled ? dayData.slots.map((slot, slotIdx) => (
                                                  <div key={slotIdx} className="hours-editor-slot">
                                                    <select
                                                      value={slot.open}
                                                      onChange={(e) =>
                                                        updateHoursSlot(day, slotIdx, "open", e.target.value)
                                                      }
                                                      className="form-input"
                                                    >
                                                      {HOURS_TIME_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                          {opt.label}
                                                        </option>
                                                      ))}
                                                    </select>
                                                    <span>-</span>
                                                    <select
                                                      value={slot.close}
                                                      onChange={(e) =>
                                                        updateHoursSlot(day, slotIdx, "close", e.target.value)
                                                      }
                                                      className="form-input"
                                                    >
                                                      {HOURS_TIME_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                          {opt.label}
                                                        </option>
                                                      ))}
                                                    </select>
                                                    {dayData.slots.length > 1 && (
                                                      <button
                                                        type="button"
                                                        onClick={() => removeHoursSlot(day, slotIdx)}
                                                        className="tag-chip-remove"
                                                      >
                                                        ×
                                                      </button>
                                                    )}
                                                  </div>
                                                )) : null}
                                            </div>
                                          );
                                        })}
                                      </div> : null}
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

                                    <div className="form-field full-width">
                                      <label className="field-label">
                                        Delivery Address
                                        <span className="field-hint">
                                          Used for delivery price calculations. Search to update.
                                        </span>
                                      </label>
                                      <GooglePlacesAutocomplete
                                        onPlaceSelect={(place) => setPendingAddress(place)}
                                        defaultValue={
                                          restaurant.address
                                            ? [
                                                restaurant.address.addressLine1,
                                                restaurant.address.city,
                                                restaurant.address.zipcode,
                                              ]
                                                .filter(Boolean)
                                                .join(", ")
                                            : ""
                                        }
                                      />
                                      {(pendingAddress || restaurant.address) ? <div className="address-preview">
                                          <div className="address-preview-grid">
                                            <div className="address-preview-item">
                                              <span className="address-preview-label">Street</span>
                                              <span className="address-preview-value">
                                                {pendingAddress?.addressLine1 ||
                                                  restaurant.address?.addressLine1 ||
                                                  "—"}
                                              </span>
                                            </div>
                                            <div className="address-preview-item">
                                              <span className="address-preview-label">City</span>
                                              <span className="address-preview-value">
                                                {pendingAddress?.city ||
                                                  restaurant.address?.city ||
                                                  "—"}
                                              </span>
                                            </div>
                                            <div className="address-preview-item">
                                              <span className="address-preview-label">Postcode</span>
                                              <span className="address-preview-value">
                                                {pendingAddress?.zipcode ||
                                                  restaurant.address?.zipcode ||
                                                  "—"}
                                              </span>
                                            </div>
                                            <div className="address-preview-item">
                                              <span className="address-preview-label">Coordinates</span>
                                              <span className="address-preview-value">
                                                {(
                                                  pendingAddress?.location ||
                                                  restaurant.address?.location
                                                )
                                                  ? `${(pendingAddress?.location?.latitude ?? restaurant.address?.location?.latitude)?.toFixed(6)}, ${(pendingAddress?.location?.longitude ?? restaurant.address?.location?.longitude)?.toFixed(6)}`
                                                  : "—"}
                                              </span>
                                            </div>
                                          </div>
                                          {pendingAddress ? <div className="address-changed-badge">
                                              <MapPin size={12} />
                                              Address updated — save to apply
                                            </div> : null}
                                        </div> : null}
                                    </div>

                                    <div className="form-field full-width">
                                      <label className="field-label">
                                        Restaurant Logo
                                        <span className="field-hint">Circular logo shown on menu item cards</span>
                                      </label>
                                      <CateringImageUpload
                                        imageUrl={editForm.logoImageUrl}
                                        isUploading={uploadingLogoImage}
                                        onImageSelect={handleLogoImageSelect}
                                        onImageRemove={() => setEditForm({ ...editForm, logoImageUrl: "" })}
                                        previewAspectRatio="1"
                                      />
                                    </div>

                                    {isEditingShowOnSite ? <div className="form-field full-width">
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
                                      </div> : null}
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
                                      <span className="setting-label">VAT Number</span>
                                      <span className="setting-value">
                                        {restaurant.vatNumber
                                          ? restaurant.vatNumber
                                          : <span style={{ color: "#9ca3af" }}>Not VAT-registered</span>}
                                      </span>
                                    </div>
                                    <div className="setting-item">
                                      <span className="setting-label">FSA Rating</span>
                                      <span className="setting-value">
                                        {restaurant.fsa !== undefined && restaurant.fsa !== null
                                          ? `${restaurant.fsa}/5`
                                          : "N/A"}
                                        {restaurant.fsaLink ? <a
                                            href={restaurant.fsaLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="fsa-link"
                                          >
                                            <ExternalLink size={12} />
                                          </a> : null}
                                      </span>
                                    </div>
                                    <div className="setting-item">
                                      <span className="setting-label">Show on Site</span>
                                      <span
                                        className={`setting-value ${
                                          restaurant.showOnSite ? "badge-yes" : "badge-no"
                                        }`}
                                      >
                                        {restaurant.showOnSite ? "Yes" : "No"}
                                      </span>
                                    </div>
                                    <div className="setting-item">
                                      <span className="setting-label">Price Range</span>
                                      <span className="setting-value">
                                        {restaurant.priceRange || "Not set"}
                                      </span>
                                    </div>
                                    <div className="setting-item full-width">
                                      <span className="setting-label">Catering Hours</span>
                                      <span className="setting-value">
                                        {formatCateringHours(restaurant.cateringOperatingHours)}
                                      </span>
                                    </div>
                                    {restaurant.tags && restaurant.tags.length > 0 ? <div className="setting-item full-width">
                                        <span className="setting-label">Tags</span>
                                        <div className="tags-display">
                                          {restaurant.tags.map((tag, i) => (
                                            <span key={i} className="tag-chip tag-chip-readonly">{tag}</span>
                                          ))}
                                        </div>
                                      </div> : null}
                                  </div>

                                  {restaurant.showOnSite && restaurant.images?.[0] ? <div className="catering-image-display">
                                      <span className="setting-label">Catering Image</span>
                                      <img
                                        src={restaurant.images[0]}
                                        alt="Catering"
                                        className="catering-display-img"
                                      />
                                    </div> : null}

                                  {restaurant.restaurant_description ? <div className="description-display">
                                      <span className="setting-label">Description</span>
                                      <p className="description-text">{restaurant.restaurant_description}</p>
                                    </div> : null}

                                  {restaurant.address ? <div className="address-display">
                                      <MapPin size={14} />
                                      <span>
                                        {restaurant.address.addressLine1}
                                        {restaurant.address.addressLine2 ? `, ${restaurant.address.addressLine2}` : null}
                                        {restaurant.address.city ? `, ${restaurant.address.city}` : null}
                                        {restaurant.address.zipcode ? ` ${restaurant.address.zipcode}` : null}
                                      </span>
                                    </div> : null}

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

      {imageToCrop ? <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        /> : null}

      {logoImageToCrop ? <ImageCropper
          imageSrc={logoImageToCrop}
          onCropComplete={handleLogoCropComplete}
          onCancel={handleLogoCropCancel}
          aspectRatio={1}
        /> : null}
    </div>
  );
};

export default RestaurantAdminDashboard;
