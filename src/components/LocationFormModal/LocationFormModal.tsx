import React, { useState, useEffect, useRef } from "react";
import { Upload, X, ImageOff } from "lucide-react";
import type { EventLocation, CreateEventLocationDto } from "../../types/event-location.types";
import { uploadImage } from "../../services/bundles.service";
import ImageCropper from "../ImageCropper";
import "./LocationFormModal.css";

interface LocationFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData?: EventLocation;
  isSubmitting: boolean;
  onSubmit: (data: CreateEventLocationDto) => void;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  minLat?: string;
  maxLat?: string;
  minLng?: string;
  maxLng?: string;
}

const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  mode,
  initialData,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [minLat, setMinLat] = useState("");
  const [maxLat, setMaxLat] = useState("");
  const [minLng, setMinLng] = useState("");
  const [maxLng, setMaxLng] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"image" | "banner">("image");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setImage(initialData.image ?? "");
      setBannerImage(initialData.bannerImage ?? "");
      setMinLat(String(initialData.minLat));
      setMaxLat(String(initialData.maxLat));
      setMinLng(String(initialData.minLng));
      setMaxLng(String(initialData.maxLng));
    } else if (isOpen && !initialData) {
      setName("");
      setImage("");
      setBannerImage("");
      setMinLat("");
      setMaxLat("");
      setMinLng("");
      setMaxLng("");
    }
    setErrors({});
    setImageToCrop(null);
    setCropTarget("image");
    setUploading(false);
  }, [isOpen, initialData]);

  const handleFileChange = (target: "image" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size must be less than 10MB");
      return;
    }

    setCropTarget(target);
    const reader = new FileReader();
    reader.onload = () => setImageToCrop(reader.result as string);
    reader.readAsDataURL(file);

    const ref = target === "image" ? fileInputRef : bannerFileInputRef;
    if (ref.current) ref.current.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploading(true);
      setImageToCrop(null);
      const filename = cropTarget === "banner" ? "location-banner.jpg" : "location-image.jpg";
      const file = new File([croppedBlob], filename, { type: "image/jpeg" });
      const url = await uploadImage(file);
      if (cropTarget === "banner") {
        setBannerImage(url);
      } else {
        setImage(url);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => setImageToCrop(null);

  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!name.trim()) {
      errs.name = "Name is required";
    } else if (name.trim().length > 100) {
      errs.name = "Name must be 100 characters or fewer";
    }

    const minLatNum = parseFloat(minLat);
    const maxLatNum = parseFloat(maxLat);
    const minLngNum = parseFloat(minLng);
    const maxLngNum = parseFloat(maxLng);

    if (minLat === "" || isNaN(minLatNum)) {
      errs.minLat = "Required";
    } else if (minLatNum < -90 || minLatNum > 90) {
      errs.minLat = "Must be between -90 and 90";
    }

    if (maxLat === "" || isNaN(maxLatNum)) {
      errs.maxLat = "Required";
    } else if (maxLatNum < -90 || maxLatNum > 90) {
      errs.maxLat = "Must be between -90 and 90";
    }

    if (!errs.minLat && !errs.maxLat && minLatNum >= maxLatNum) {
      errs.maxLat = "Max lat must be greater than min lat";
    }

    if (minLng === "" || isNaN(minLngNum)) {
      errs.minLng = "Required";
    } else if (minLngNum < -180 || minLngNum > 180) {
      errs.minLng = "Must be between -180 and 180";
    }

    if (maxLng === "" || isNaN(maxLngNum)) {
      errs.maxLng = "Required";
    } else if (maxLngNum < -180 || maxLngNum > 180) {
      errs.maxLng = "Must be between -180 and 180";
    }

    if (!errs.minLng && !errs.maxLng && minLngNum >= maxLngNum) {
      errs.maxLng = "Max lng must be greater than min lng";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      image: image || undefined,
      bannerImage: bannerImage || undefined,
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLng: parseFloat(minLng),
      maxLng: parseFloat(maxLng),
    });
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const busy = isSubmitting || uploading;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
          <h2>{mode === "add" ? "Add Location" : "Edit Location"}</h2>
          <p className="modal-subtitle">
            {mode === "add"
              ? "Create a new event location with geographic bounds"
              : "Update location details and bounds"}
          </p>

          <div className="form-group">
            <label>Location Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cape Town, Johannesburg CBD"
              autoFocus
              maxLength={100}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* Image upload */}
          <div className="form-group">
            <label>Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange("image")}
              style={{ display: "none" }}
            />
            {image ? (
              <div className="img-preview-wrap">
                <img src={image} alt="Location preview" className="img-preview" />
                <div className="img-preview-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <Upload size={14} /> Replace
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setImage("")}
                    disabled={busy}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="img-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {uploading && cropTarget === "image" ? (
                  <>
                    <div className="upload-spinner" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImageOff size={20} className="img-upload-icon" />
                    <span>Click to upload an image</span>
                    <span className="img-upload-hint">JPEG, PNG, WebP or GIF · max 10 MB</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Banner image upload */}
          <div className="form-group">
            <label>Banner Image</label>
            <input
              ref={bannerFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange("banner")}
              style={{ display: "none" }}
            />
            {bannerImage ? (
              <div className="img-preview-wrap">
                <img src={bannerImage} alt="Banner preview" className="img-preview img-preview-banner" />
                <div className="img-preview-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <Upload size={14} /> Replace
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setBannerImage("")}
                    disabled={busy}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="img-upload-btn"
                onClick={() => bannerFileInputRef.current?.click()}
                disabled={busy}
              >
                {uploading && cropTarget === "banner" ? (
                  <>
                    <div className="upload-spinner" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImageOff size={20} className="img-upload-icon" />
                    <span>Click to upload a banner image</span>
                    <span className="img-upload-hint">JPEG, PNG, WebP or GIF · max 10 MB</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bounds-section">
            <div className="bounds-section-label">Latitude Bounds</div>
            <div className="bounds-row">
              <div className="form-group">
                <label>Min Latitude *</label>
                <input
                  type="number"
                  value={minLat}
                  onChange={(e) => setMinLat(e.target.value)}
                  placeholder="-90 to 90"
                  step="any"
                  min={-90}
                  max={90}
                />
                {errors.minLat && <span className="field-error">{errors.minLat}</span>}
              </div>
              <div className="form-group">
                <label>Max Latitude *</label>
                <input
                  type="number"
                  value={maxLat}
                  onChange={(e) => setMaxLat(e.target.value)}
                  placeholder="-90 to 90"
                  step="any"
                  min={-90}
                  max={90}
                />
                {errors.maxLat && <span className="field-error">{errors.maxLat}</span>}
              </div>
            </div>
          </div>

          <div className="bounds-section">
            <div className="bounds-section-label">Longitude Bounds</div>
            <div className="bounds-row">
              <div className="form-group">
                <label>Min Longitude *</label>
                <input
                  type="number"
                  value={minLng}
                  onChange={(e) => setMinLng(e.target.value)}
                  placeholder="-180 to 180"
                  step="any"
                  min={-180}
                  max={180}
                />
                {errors.minLng && <span className="field-error">{errors.minLng}</span>}
              </div>
              <div className="form-group">
                <label>Max Longitude *</label>
                <input
                  type="number"
                  value={maxLng}
                  onChange={(e) => setMaxLng(e.target.value)}
                  placeholder="-180 to 180"
                  step="any"
                  min={-180}
                  max={180}
                />
                {errors.maxLng && <span className="field-error">{errors.maxLng}</span>}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={handleClose} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={busy}
            >
              {isSubmitting
                ? mode === "add"
                  ? "Creating..."
                  : "Saving..."
                : mode === "add"
                ? "Create Location"
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={cropTarget === "banner" ? 2 / 1 : 1}
        />
      )}
    </>
  );
};

export default LocationFormModal;
