import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import "./AddRestaurantModal.css";
import { createAddress } from "../../services/address.service";
import {
  createRestaurant,
  createRestaurantUser,
} from "../../services/restaurant.service";
import { getAllMarkets } from "../../services/market.service";

import type { Market } from "../../types/market.types";
import type {
  CreateRestaurantUserDto,
} from "../../types/user.types";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddRestaurantModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddRestaurantModalProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  // Store IDs from each step
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [createdRestaurantUserId, setCreatedRestaurantUserId] = useState<
    string | null
  >(null);
  const [createdAddressId, setCreatedAddressId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // User details
    username: "",
    password: "",
    email: "",
    phoneNumber: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    profilePicture: "",

    // Address details
    addressName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    zipcode: "",
    latitude: "",
    longitude: "",

    // Restaurant details
    restaurant_name: "",
    restaurant_description: "",
    featured: false,
    openingHours: DAYS.map((day) => ({ day, open: "09:00", close: "21:00" })),
    images: [""],
    marketId: "",
    restaurantNumber: "",
    fsa: "",
    fsaLink: "",
    autoAccept: true,
    priceRange: "",
    tags: [] as string[],
  });

  // Fetch markets when modal opens
  useEffect(() => {
    const fetchMarkets = async () => {
      if (isOpen && markets.length === 0) {
        try {
          setLoadingMarkets(true);
          const marketData = await getAllMarkets();
          setMarkets(marketData);
        } catch (err) {
          console.error("Error fetching markets:", err);
          setError("Failed to load markets. Please try again.");
        } finally {
          setLoadingMarkets(false);
        }
      }
    };

    fetchMarkets();
  }, [isOpen]);

  const handleInputChange = (field : any, value : any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (
    index: number,
    field: "open" | "close",
    value: string
  ) => {
    const newHours = [...formData.openingHours];
    newHours[index][field] = value;
    setFormData((prev) => ({ ...prev, openingHours: newHours }));
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    setFormData((prev) => ({ ...prev, images: [...prev.images, ""] }));
  };

  const removeImageField = (index : number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      images: newImages.length ? newImages : [""],
    }));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return (
          formData.username &&
          formData.password &&
          formData.email &&
          formData.phoneNumber &&
          formData.bankName &&
          formData.accountNumber &&
          formData.routingNumber
        );
      case 2:
        return (
          formData.addressName &&
          formData.addressLine1 &&
          formData.city &&
          formData.zipcode &&
          formData.latitude &&
          formData.longitude
        );
      case 3:
        return (
          formData.restaurant_name &&
          formData.restaurant_description &&
          formData.marketId
        );
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (step === 1) {
        const userDto: CreateRestaurantUserDto = {
          userDetails: {
            username: formData.username,
            password: formData.password,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            role: "restaurant_owner",
            verified: true,
            profilePicture: formData.profilePicture || undefined,
          },
          bankingInformation: {
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            routingNumber: formData.routingNumber,
          },
          rating: 5.0,
        };
        // Step 1: Create Restaurant User

        const userResult : any = await createRestaurantUser(userDto);

        // Check if the response has the expected structure
        if (!userResult || !userResult.user || !userResult.user.id || !userResult.id) {
          setError("Failed to create user. Invalid response from server.");
          return;
        }

        setCreatedUserId(userResult.user.id);
        setCreatedRestaurantUserId(userResult.id);

        console.log("Created user:", userResult);
        setStep(2);
      } else if (step === 2) {
        // Step 2: Create Address
        if (!createdUserId) {
          setError("User ID not found. Please start over.");
          return;
        }
        const addressResult = await createAddress({
          userId: createdUserId,
          name: formData.addressName,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city,
          zipcode: formData.zipcode,
          location: {
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
          },
        });

        setCreatedAddressId(addressResult.id);
        console.log("Created address:", addressResult);
        setStep(3);
      }
    } catch (err : any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to complete this step";
      setError(errorMessage);
      console.error("Step error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
    setError("");
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      setError("Please fill in all required fields");
      return;
    }

    if (!createdRestaurantUserId || !createdAddressId) {
      setError("Missing required IDs. Please start over.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const restaurant = await createRestaurant({
        restaurant_name: formData.restaurant_name,
        status: 'inactive',
        restaurant_description: formData.restaurant_description,
        featured: formData.featured,
        addressId: createdAddressId,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        openingHours: formData.openingHours,
        images: formData.images.filter((img) => img.trim() !== ""),
        ownerId: createdRestaurantUserId,
        marketId: formData.marketId,
        restaurantNumber: formData.restaurantNumber || undefined,
        fsa: formData.fsa ? parseFloat(formData.fsa) : undefined,
        fsaLink: formData.fsaLink || undefined,
        autoAccept: formData.autoAccept,
        priceRange: formData.priceRange || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      });

      console.log("Created restaurant:", restaurant);
      onSuccess();
      handleClose();
    } catch (err : any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create restaurant";
      setError(errorMessage);
      console.error("Restaurant creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setError("");
    setCreatedUserId(null);
    setCreatedRestaurantUserId(null);
    setCreatedAddressId(null);
    setFormData({
      username: "",
      password: "",
      email: "",
      phoneNumber: "",
      bankName: "",
      accountNumber: "",
      routingNumber: "",
      profilePicture: "",
      addressName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      zipcode: "",
      latitude: "",
      longitude: "",
      restaurant_name: "",
      restaurant_description: "",
      featured: false,
      openingHours: DAYS.map((day) => ({ day, open: "09:00", close: "21:00" })),
      images: [""],
      marketId: "",
      restaurantNumber: "",
      fsa: "",
      fsaLink: "",
      autoAccept: true,
      priceRange: "",
      tags: [] as string[],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            <h2 className="modal-title">Add New Restaurant</h2>
            <p className="modal-subtitle">Step {step} of 3</p>
          </div>
          <button onClick={handleClose} className="modal-close-btn">
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-steps">
            <span
              className={`progress-step ${
                step >= 1 ? "progress-step-active" : "progress-step-inactive"
              }`}
            >
              Owner Details
            </span>
            <span
              className={`progress-step ${
                step >= 2 ? "progress-step-active" : "progress-step-inactive"
              }`}
            >
              Address
            </span>
            <span
              className={`progress-step ${
                step >= 3 ? "progress-step-active" : "progress-step-inactive"
              }`}
            >
              Restaurant Info
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-error">
            <AlertCircle size={20} className="alert-error-icon" />
            <p className="alert-error-text">{error}</p>
          </div>
        )}

        {/* Form Content */}
        <div className="modal-body">
          {/* Step 1: Owner Details */}
          {step === 1 && (
            <div className="form-section">
              <h3 className="form-section-title">Restaurant Owner Details</h3>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    Username <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    className="form-input"
                    placeholder="owner_username"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Password <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="form-input"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">
                  Email <span className="form-label-required">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="form-input"
                  placeholder="owner@email.com"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  Phone Number <span className="form-label-required">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  className="form-input"
                  placeholder="+1234567890"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Profile Picture URL</label>
                <input
                  type="url"
                  value={formData.profilePicture}
                  onChange={(e) =>
                    handleInputChange("profilePicture", e.target.value)
                  }
                  className="form-input"
                  placeholder="https://example.com/picture.jpg"
                />
              </div>

              <h4 className="form-subsection-title">Banking Information</h4>

              <div className="form-field">
                <label className="form-label">
                  Bank Name <span className="form-label-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) =>
                    handleInputChange("bankName", e.target.value)
                  }
                  className="form-input"
                  placeholder="Bank Name"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    Account Number{" "}
                    <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      handleInputChange("accountNumber", e.target.value)
                    }
                    className="form-input"
                    placeholder="123456789"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Routing Number{" "}
                    <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.routingNumber}
                    onChange={(e) =>
                      handleInputChange("routingNumber", e.target.value)
                    }
                    className="form-input"
                    placeholder="987654321"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="form-section">
              <h3 className="form-section-title">Restaurant Address</h3>

              <div className="form-field">
                <label className="form-label">
                  Address Name <span className="form-label-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.addressName}
                  onChange={(e) =>
                    handleInputChange("addressName", e.target.value)
                  }
                  className="form-input"
                  placeholder="Main Location"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  Address Line 1 <span className="form-label-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) =>
                    handleInputChange("addressLine1", e.target.value)
                  }
                  className="form-input"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) =>
                    handleInputChange("addressLine2", e.target.value)
                  }
                  className="form-input"
                  placeholder="Suite 100"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    City <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="form-input"
                    placeholder="City Name"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Zipcode <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.zipcode}
                    onChange={(e) =>
                      handleInputChange("zipcode", e.target.value)
                    }
                    className="form-input"
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    Latitude <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) =>
                      handleInputChange("latitude", e.target.value)
                    }
                    className="form-input"
                    placeholder="12.3456"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Longitude <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) =>
                      handleInputChange("longitude", e.target.value)
                    }
                    className="form-input"
                    placeholder="65.4321"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Restaurant Info */}
          {step === 3 && (
            <div className="form-section">
              <h3 className="form-section-title">Restaurant Information</h3>

              <div className="form-field">
                <label className="form-label">
                  Restaurant Name <span className="form-label-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.restaurant_name}
                  onChange={(e) =>
                    handleInputChange("restaurant_name", e.target.value)
                  }
                  className="form-input"
                  placeholder="My Restaurant"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  Description <span className="form-label-required">*</span>
                </label>
                <textarea
                  value={formData.restaurant_description}
                  onChange={(e) =>
                    handleInputChange("restaurant_description", e.target.value)
                  }
                  rows={3}
                  className="form-input form-textarea"
                  placeholder="Best food in town"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    Market <span className="form-label-required">*</span>
                  </label>
                  <select
                    value={formData.marketId}
                    onChange={(e) =>
                      handleInputChange("marketId", e.target.value)
                    }
                    className="form-select"
                    disabled={loadingMarkets}
                  >
                    <option value="">
                      {loadingMarkets
                        ? "Loading markets..."
                        : "Select a market"}
                    </option>
                    {markets.map((market) => (
                      <option key={market.id} value={market.id}>
                        {market.market_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) =>
                      handleInputChange("featured", e.target.checked)
                    }
                    className="form-checkbox"
                  />
                  <span className="checkbox-label-text">Featured</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.autoAccept}
                    onChange={(e) =>
                      handleInputChange("autoAccept", e.target.checked)
                    }
                    className="form-checkbox"
                  />
                  <span className="checkbox-label-text">
                    Auto Accept Orders
                  </span>
                </label>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label className="form-label">Restaurant Number</label>
                  <input
                    type="text"
                    value={formData.restaurantNumber}
                    onChange={(e) =>
                      handleInputChange("restaurantNumber", e.target.value)
                    }
                    className="form-input"
                    placeholder="R123"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">FSA Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fsa}
                    onChange={(e) => handleInputChange("fsa", e.target.value)}
                    className="form-input"
                    placeholder="4.5"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">FSA Link</label>
                  <input
                    type="url"
                    value={formData.fsaLink}
                    onChange={(e) =>
                      handleInputChange("fsaLink", e.target.value)
                    }
                    className="form-input"
                    placeholder="https://fsa.gov"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">Price Range</label>
                  <select
                    value={formData.priceRange}
                    onChange={(e) => handleInputChange("priceRange", e.target.value)}
                    className="form-select"
                  >
                    <option value="">Not set</option>
                    <option value="Budget">Budget</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Premium">Premium</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Tags <span className="form-label-hint">(up to 5)</span></label>
                  <div className="tags-input-container">
                    {formData.tags.map((tag, i) => (
                      <span key={i} className="tag-chip">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleInputChange("tags", formData.tags.filter((_: string, idx: number) => idx !== i))}
                          className="tag-chip-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {formData.tags.length < 5 && (
                      <input
                        type="text"
                        className="tag-input"
                        placeholder="Add tag, press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && formData.tags.length < 5) {
                              handleInputChange("tags", [...formData.tags, val]);
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Opening Hours</label>
                <div className="hours-container">
                  <div className="hours-list">
                    {formData.openingHours.map((hours, index) => (
                      <div key={hours.day} className="hours-row">
                        <span className="hours-day-label">{hours.day}</span>
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) =>
                            handleHoursChange(index, "open", e.target.value)
                          }
                          className="hours-input"
                        />
                        <span className="hours-separator">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) =>
                            handleHoursChange(index, "close", e.target.value)
                          }
                          className="hours-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Images</label>
                <div className="images-list">
                  {formData.images.map((image, index) => (
                    <div key={index} className="image-field-group">
                      <input
                        type="url"
                        value={image}
                        onChange={(e) =>
                          handleImageChange(index, e.target.value)
                        }
                        className="form-input image-field-input"
                        placeholder="https://example.com/image.jpg"
                      />
                      {formData.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeImageField(index)}
                          className="remove-image-btn"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addImageField}
                    className="add-image-btn"
                  >
                    + Add Another Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            onClick={step === 1 ? handleClose : handleBack}
            className={`modal-btn ${
              step === 1 ? "modal-btn-cancel" : "modal-btn-back"
            }`}
            disabled={loading}
          >
            {step === 1 ? (
              <>
                <X size={18} />
                Cancel
              </>
            ) : (
              <>
                <ChevronLeft size={18} />
                Back
              </>
            )}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="modal-btn modal-btn-next"
            >
              {loading ? (
                <>
                  <div className="btn-spinner" />
                  {step === 1 ? "Creating User..." : "Creating Address..."}
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="modal-btn modal-btn-submit"
            >
              {loading ? (
                <>
                  <div className="btn-spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Create Restaurant
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export { AddRestaurantModal };
