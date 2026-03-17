import React, { useState, useEffect, useRef, useCallback } from "react";
import { Upload, X, ImageOff, Search, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import type { EventLocation, EventContinent, CreateEventLocationDto } from "../../types/event-location.types";
import { uploadImage } from "../../services/bundles.service";
import eventContinentService from "../../services/event-continent.service";
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
  continentId?: string;
  minLat?: string;
  maxLat?: string;
  minLng?: string;
  maxLng?: string;
}

interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [minLat, maxLat, minLng, maxLng]
  type: string;
  class: string;
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
  const [continentId, setContinentId] = useState("");
  const [continents, setContinents] = useState<EventContinent[]>([]);
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

  // Geocoding state
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [boundsSource, setBoundsSource] = useState<string>("");
  const [showBoundsEditor, setShowBoundsEditor] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Geocode search using Nominatim (OpenStreetMap)
  const searchGeo = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setGeoResults([]);
      setShowSuggestions(false);
      return;
    }
    setGeoLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: "6",
        featuretype: "city",
        addressdetails: "0",
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) throw new Error("Geocoding failed");
      const data: GeoResult[] = await res.json();
      setGeoResults(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setGeoResults([]);
    } finally {
      setGeoLoading(false);
    }
  }, []);

  const handleGeoQueryChange = (value: string) => {
    setGeoQuery(value);
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(() => searchGeo(value), 400);
  };

  const handleGeoSelect = (result: GeoResult) => {
    const [bMinLat, bMaxLat, bMinLng, bMaxLng] = result.boundingbox;
    setMinLat(bMinLat);
    setMaxLat(bMaxLat);
    setMinLng(bMinLng);
    setMaxLng(bMaxLng);

    // Use just the city/region name (first part of display_name)
    const shortName = result.display_name.split(",")[0].trim();
    setName(shortName);
    setGeoQuery("");
    setBoundsSource(result.display_name);
    setShowSuggestions(false);
    setGeoResults([]);
    setErrors((prev) => ({ ...prev, minLat: undefined, maxLat: undefined, minLng: undefined, maxLng: undefined }));
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      eventContinentService.getAllContinents().then(setContinents).catch(() => {});
    }
    if (isOpen && initialData) {
      setName(initialData.name);
      setContinentId(initialData.continentId ?? "");
      setImage(initialData.image ?? "");
      setBannerImage(initialData.bannerImage ?? "");
      setMinLat(String(initialData.minLat));
      setMaxLat(String(initialData.maxLat));
      setMinLng(String(initialData.minLng));
      setMaxLng(String(initialData.maxLng));
      setBoundsSource("");
      setShowBoundsEditor(false);
    } else if (isOpen && !initialData) {
      setName("");
      setContinentId("");
      setImage("");
      setBannerImage("");
      setMinLat("");
      setMaxLat("");
      setMinLng("");
      setMaxLng("");
      setBoundsSource("");
      setShowBoundsEditor(false);
    }
    setGeoQuery("");
    setGeoResults([]);
    setShowSuggestions(false);
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

    if (!continentId) {
      errs.continentId = "Continent is required";
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
      continentId,
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

          {/* City Search */}
          <div className="form-group" ref={suggestionsRef}>
            <label>Search City</label>
            <div className="geo-search-wrap">
              <Search size={16} className="geo-search-icon" />
              <input
                type="text"
                value={geoQuery}
                onChange={(e) => handleGeoQueryChange(e.target.value)}
                placeholder="Type a city name to auto-fill bounds..."
                autoFocus={mode === "add"}
                className="geo-search-input"
              />
              {geoLoading && <div className="upload-spinner geo-spinner" />}
            </div>
            {showSuggestions && geoResults.length > 0 && (
              <div className="geo-suggestions">
                {geoResults.map((r) => (
                  <button
                    key={r.place_id}
                    type="button"
                    className="geo-suggestion-item"
                    onClick={() => handleGeoSelect(r)}
                  >
                    <MapPin size={14} className="geo-suggestion-icon" />
                    <span>{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Location Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cape Town, Johannesburg CBD"
              maxLength={100}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Continent *</label>
            <select
              value={continentId}
              onChange={(e) => setContinentId(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            >
              <option value="">Select a continent</option>
              {continents.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.continentId && <span className="field-error">{errors.continentId}</span>}
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

          {/* Bounds status / collapsible editor */}
          {(minLat || maxLat || minLng || maxLng) && (
            <div className="bounds-status">
              <div className="bounds-status-header">
                <div>
                  <MapPin size={14} />
                  <span className="bounds-status-label">
                    {boundsSource ? "Bounds auto-filled" : "Geographic bounds set"}
                  </span>
                </div>
                <button
                  type="button"
                  className="bounds-toggle-btn"
                  onClick={() => setShowBoundsEditor(!showBoundsEditor)}
                >
                  {showBoundsEditor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showBoundsEditor ? "Hide" : "Edit"}
                </button>
              </div>
              {boundsSource && (
                <div className="bounds-status-source">From: {boundsSource}</div>
              )}
              {!showBoundsEditor && (
                <div className="bounds-status-summary">
                  Lat: {Number(minLat).toFixed(4)} to {Number(maxLat).toFixed(4)} · Lng: {Number(minLng).toFixed(4)} to {Number(maxLng).toFixed(4)}
                </div>
              )}
            </div>
          )}

          {(showBoundsEditor || (!minLat && !maxLat && !minLng && !maxLng)) && (
            <>
              <div className="bounds-section">
                <div className="bounds-section-label">Latitude Bounds</div>
                <div className="bounds-row">
                  <div className="form-group">
                    <label>Min Latitude *</label>
                    <input
                      type="number"
                      value={minLat}
                      onChange={(e) => { setMinLat(e.target.value); setBoundsSource(""); }}
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
                      onChange={(e) => { setMaxLat(e.target.value); setBoundsSource(""); }}
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
                      onChange={(e) => { setMinLng(e.target.value); setBoundsSource(""); }}
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
                      onChange={(e) => { setMaxLng(e.target.value); setBoundsSource(""); }}
                      placeholder="-180 to 180"
                      step="any"
                      min={-180}
                      max={180}
                    />
                    {errors.maxLng && <span className="field-error">{errors.maxLng}</span>}
                  </div>
                </div>
              </div>
            </>
          )}

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
