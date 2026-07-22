import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  AlertCircle,
  Trash2,
  Edit2,
  Calendar,
  Users,
  CalendarDays,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  ImagePlus,
  RefreshCw,
  ImageOff,
} from "lucide-react";
import calendarService from "../../services/calendar.service";
import { uploadImage } from "../../services/bundles.service";
import EventCoverPicker from "../../components/EventCoverPicker/EventCoverPicker";
import ImageCropper from "../../components/ImageCropper";
import type {
  AdminCalendar,
  AdminCalendarSearchParams,
  CalendarType,
  AdminUpdateCalendarDto,
} from "../../types/calendar.types";
import "./CalendarsScreen.css";

const TYPE_OPTIONS: { value: CalendarType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "personal", label: "Personal" },
  { value: "team", label: "Team" },
];

const VISIBILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Visibility" },
  { value: "true", label: "Public" },
  { value: "false", label: "Private" },
];

const CalendarsScreen: React.FC = () => {
  const [calendars, setCalendars] = useState<AdminCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<CalendarType | "">("");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<AdminCalendar | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editType, setEditType] = useState<CalendarType>("personal");
  const [editCalendarImage, setEditCalendarImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);

  const fetchCalendars = useCallback(async () => {
    try {
      setLoading(true);
      const params: AdminCalendarSearchParams = {
        skip: page * pageSize,
        take: pageSize,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (typeFilter) params.type = typeFilter;
      if (visibilityFilter !== "") params.isPublic = visibilityFilter === "true";

      const data = await calendarService.searchCalendars(params);
      setCalendars(data.calendars);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendars");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, typeFilter, visibilityFilter]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchCalendars();
  };

  const openEditModal = (calendar: AdminCalendar) => {
    setSelectedCalendar(calendar);
    setEditName(calendar.name);
    setEditDescription(calendar.description || "");
    setEditIsPublic(calendar.isPublic);
    setEditType(calendar.calendarType);
    setEditCalendarImage(calendar.calendarImage);
    setShowEditModal(true);
  };

  const openDeleteModal = (calendar: AdminCalendar) => {
    setSelectedCalendar(calendar);
    setShowDeleteModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCalendar) return;

    try {
      setSubmitting(true);
      const dto: AdminUpdateCalendarDto = {
        name: editName.trim(),
        description: editDescription.trim(),
        isPublic: editIsPublic,
        calendarType: editType,
        calendarImage: editCalendarImage || "",
      };

      await calendarService.updateCalendar(selectedCalendar.id, dto);
      setShowEditModal(false);
      fetchCalendars();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update calendar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCalendar) return;

    try {
      setSubmitting(true);
      const result = await calendarService.deleteCalendar(selectedCalendar.id);
      alert(result.message);
      setShowDeleteModal(false);
      fetchCalendars();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete calendar");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleCalendarCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size must be less than 10MB");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageToCrop(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleCalendarCoverCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploadingCover(true);
      setImageToCrop(null);
      const file = new File([croppedBlob], "calendar-cover.jpg", { type: "image/jpeg" });
      const imageUrl = await uploadImage(file);
      setEditCalendarImage(imageUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload cover image");
    } finally {
      setUploadingCover(false);
    }
  };

  if (error && calendars.length === 0) {
    return (
      <div className="calendars-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button onClick={fetchCalendars} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="calendars-container">
      <div className="calendars-header">
        <div>
          <h1>Calendar Management</h1>
          <p>Search, view, update, and delete calendars</p>
        </div>
        <div className="calendars-stats">
          <span className="stat-badge">{total} total calendars</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="calendars-filters">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search calendars by name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </form>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as CalendarType | "");
            setPage(0);
          }}
          className="type-filter"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={visibilityFilter}
          onChange={(e) => {
            setVisibilityFilter(e.target.value);
            setPage(0);
          }}
          className="visibility-filter"
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Calendars Table */}
      <div className="calendars-table-container">
        {loading && calendars.length === 0 ? (
          <div className="calendars-loading">
            <div className="spinner"></div>
            <p>Loading calendars...</p>
          </div>
        ) : (
          <table className="calendars-table">
            <thead>
              <tr>
                <th>Calendar</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Visibility</th>
                <th>Events</th>
                <th>Subscribers</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {calendars.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-results">
                    No calendars found
                  </td>
                </tr>
              ) : (
                calendars.map((calendar) => (
                  <tr key={calendar.id}>
                    <td className="calendar-name-cell">
                      <div className="calendar-name-wrapper">
                        {calendar.calendarImage ? (
                          <img
                            src={calendar.calendarImage}
                            alt={calendar.name}
                            className="calendar-thumbnail"
                          />
                        ) : (
                          <div
                            className="calendar-thumbnail-placeholder"
                            style={{ backgroundColor: calendar.calendarColor }}
                          >
                            <Calendar size={20} />
                          </div>
                        )}
                        <div className="calendar-name-info">
                          <span className="calendar-name">{calendar.name}</span>
                          <span className="calendar-url">/{calendar.calendarUrl}</span>
                        </div>
                      </div>
                    </td>
                    <td className="owner-cell">
                      <div className="owner-info">
                        <span className="owner-name">{calendar.ownerName}</span>
                        <span className="owner-email">{calendar.ownerEmail}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge ${calendar.calendarType}`}>
                        {calendar.calendarType}
                      </span>
                    </td>
                    <td>
                      <span className={`visibility-badge ${calendar.isPublic ? "public" : "private"}`}>
                        {calendar.isPublic ? (
                          <>
                            <Globe size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            Private
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="count-cell">
                        <CalendarDays size={16} />
                        <span>{calendar.upcomingEventCount}</span>
                      </div>
                    </td>
                    <td>
                      <div className="count-cell">
                        <Users size={16} />
                        <span>{calendar.subscriberCount}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {formatDate(calendar.createdAt)}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEditModal(calendar)}
                        title="Edit calendar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => openDeleteModal(calendar)}
                        title="Delete calendar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="pagination-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCalendar ? <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Calendar</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label>Calendar Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Calendar name"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Calendar description"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Cover Image</label>
              <div className="cover-edit-panel">
                <div className="cover-edit-preview">
                  {editCalendarImage ? (
                    <img src={editCalendarImage} alt={editName || selectedCalendar.name} className="cover-edit-image" />
                  ) : (
                    <div className="cover-edit-placeholder">
                      <ImagePlus size={24} />
                      <span>No cover selected</span>
                    </div>
                  )}
                </div>
                <div className="cover-edit-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCoverPicker(true)}>
                    <RefreshCw size={15} />
                    Choose Cover
                  </button>
                  <label className="btn btn-secondary cover-upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      ref={coverUploadInputRef}
                      onChange={handleCalendarCoverUpload}
                      disabled={uploadingCover}
                    />
                    <ImagePlus size={15} />
                    {uploadingCover ? "Uploading..." : "Upload Image"}
                  </label>
                  {editCalendarImage ? <button type="button" className="btn btn-secondary" onClick={() => setEditCalendarImage(null)}>
                      <ImageOff size={15} />
                      Remove
                    </button> : null}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as CalendarType)}
              >
                <option value="personal">Personal</option>
                <option value="team">Team</option>
              </select>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                />
                <label htmlFor="isPublic">Public calendar (visible to everyone)</label>
              </div>
            </div>

            <EventCoverPicker
              isOpen={showCoverPicker}
              title="Choose Calendar Cover"
              currentCover={editCalendarImage}
              onClose={() => setShowCoverPicker(false)}
              onSelect={(imageUrl) => setEditCalendarImage(imageUrl)}
              onUploadClick={() => {
                setShowCoverPicker(false);
                coverUploadInputRef.current?.click();
              }}
            />

            <div className="modal-info">
              <p>
                <strong>URL:</strong> /{selectedCalendar.calendarUrl}
              </p>
              <p>
                <strong>Owner:</strong> {selectedCalendar.ownerName} ({selectedCalendar.ownerEmail})
              </p>
              <p>
                <strong>Created:</strong> {formatDate(selectedCalendar.createdAt)}
              </p>
              <p>
                <strong>Events:</strong> {selectedCalendar.upcomingEventCount} | <strong>Subscribers:</strong> {selectedCalendar.subscriberCount}
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={submitting || !editName.trim()}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div> : null}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCalendar ? <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Calendar</h2>
              <button
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="delete-warning">
              <AlertCircle size={48} color="#ef4444" />
              <p>Are you sure you want to delete this calendar?</p>
              <p className="calendar-delete-name">{selectedCalendar.name}</p>
              {selectedCalendar.upcomingEventCount > 0 && (
                <p className="delete-note">
                  This calendar has {selectedCalendar.upcomingEventCount} upcoming event(s) linked.
                  Event associations will be removed.
                </p>
              )}
              {selectedCalendar.subscriberCount > 0 && (
                <p className="delete-note">
                  This calendar has {selectedCalendar.subscriberCount} subscriber(s).
                  All subscriptions will be removed.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? "Deleting..." : "Delete Calendar"}
              </button>
            </div>
          </div>
        </div> : null}

      {imageToCrop ? <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCalendarCoverCropComplete}
          onCancel={() => setImageToCrop(null)}
          aspectRatio={1}
        /> : null}
    </div>
  );
};

export default CalendarsScreen;
