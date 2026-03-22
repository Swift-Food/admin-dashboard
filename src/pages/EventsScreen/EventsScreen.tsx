import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  AlertCircle,
  Trash2,
  Edit2,
  Calendar,
  Users,
  Ticket,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Globe,
  Filter,
} from "lucide-react";
import eventService from "../../services/event.service";
import { getAllContinents } from "../../services/event-continent.service";
import { getAllLocations } from "../../services/event-location.service";
import type {
  AdminEvent,
  AdminEventSearchParams,
  EventStatus,
  AdminUpdateEventDto,
} from "../../types/event.types";
import type {
  EventContinent,
  EventLocation,
} from "../../types/event-location.types";
import "./EventsScreen.css";

const STATUS_OPTIONS: { value: EventStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "#6b7280",
  published: "#10b981",
  ongoing: "#3b82f6",
  completed: "#8b5cf6",
  cancelled: "#ef4444",
};

const EventsScreen: React.FC = () => {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "">("");
  const [continentFilter, setContinentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filter data
  const [continents, setContinents] = useState<EventContinent[]>([]);
  const [locations, setLocations] = useState<EventLocation[]>([]);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatus>("draft");
  const [submitting, setSubmitting] = useState(false);

  // Load continents and locations on mount
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [continentData, locationData] = await Promise.all([
          getAllContinents(),
          getAllLocations(),
        ]);
        setContinents(continentData.sort((a, b) => a.displayOrder - b.displayOrder));
        setLocations(locationData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to load filter data:", err);
      }
    };
    loadFilterData();
  }, []);

  // Filtered locations based on selected continent
  const filteredLocations = continentFilter
    ? locations.filter((loc) => loc.continentId === continentFilter)
    : locations;

  const hasActiveFilters =
    statusFilter !== "" ||
    continentFilter !== "" ||
    locationFilter !== "" ||
    startDateFilter !== "" ||
    endDateFilter !== "";

  const clearAllFilters = () => {
    setStatusFilter("");
    setContinentFilter("");
    setLocationFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
    setSearchQuery("");
    setPage(0);
  };

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params: AdminEventSearchParams = {
        skip: page * pageSize,
        take: pageSize,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;
      if (locationFilter) params.locationId = locationFilter;
      else if (continentFilter) params.continentId = continentFilter;
      if (startDateFilter) params.startDate = new Date(startDateFilter).toISOString();
      if (endDateFilter) {
        // Set end date to end of day
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        params.endDate = end.toISOString();
      }

      const data = await eventService.searchEvents(params);
      setEvents(data.events);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, continentFilter, locationFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
    fetchEvents();
  };

  const handleContinentChange = (value: string) => {
    setContinentFilter(value);
    setLocationFilter(""); // Reset location when continent changes
    setPage(0);
  };

  const handleLocationChange = (value: string) => {
    setLocationFilter(value);
    // Auto-select continent if a location is picked and continent isn't set
    if (value && !continentFilter) {
      const loc = locations.find((l) => l.id === value);
      if (loc) setContinentFilter(loc.continentId);
    }
    setPage(0);
  };

  const openEditModal = (event: AdminEvent) => {
    setSelectedEvent(event);
    setEditName(event.name);
    setEditDescription(event.description);
    setEditStatus(event.status);
    setShowEditModal(true);
  };

  const openDeleteModal = (event: AdminEvent) => {
    setSelectedEvent(event);
    setShowDeleteModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;

    try {
      setSubmitting(true);
      const dto: AdminUpdateEventDto = {
        name: editName.trim(),
        description: editDescription.trim(),
        status: editStatus,
      };

      await eventService.updateEvent(selectedEvent.id, dto);
      setShowEditModal(false);
      fetchEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      setSubmitting(true);
      const result = await eventService.deleteEvent(selectedEvent.id);
      alert(result.message);
      setShowDeleteModal(false);
      fetchEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  if (error && events.length === 0) {
    return (
      <div className="events-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button onClick={fetchEvents} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="events-container">
      <div className="events-header">
        <div>
          <h1>Event Management</h1>
          <p>Search, view, update, and delete events</p>
        </div>
        <div className="events-stats">
          <span className="stat-badge">{total} total events</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="events-filters">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search events by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as EventStatus | "");
            setPage(0);
          }}
          className="filter-select"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Location & Date Filters */}
      <div className="events-filters-row">
        <div className="filter-group">
          <Globe size={15} className="filter-icon" />
          <select
            value={continentFilter}
            onChange={(e) => handleContinentChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All Continents</option>
            {continents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <MapPin size={15} className="filter-icon" />
          <select
            value={locationFilter}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All Cities</option>
            {continentFilter ? (
              // Show locations for selected continent
              filteredLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))
            ) : (
              // Group by continent
              continents.map((continent) => {
                const continentLocations = locations.filter(
                  (loc) => loc.continentId === continent.id
                );
                if (continentLocations.length === 0) return null;
                return (
                  <optgroup key={continent.id} label={continent.name}>
                    {continentLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })
            )}
          </select>
        </div>

        <div className="filter-group">
          <Calendar size={15} className="filter-icon" />
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => {
              setStartDateFilter(e.target.value);
              setPage(0);
            }}
            className="filter-date"
            placeholder="From"
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => {
              setEndDateFilter(e.target.value);
              setPage(0);
            }}
            className="filter-date"
            min={startDateFilter || undefined}
          />
        </div>

        {hasActiveFilters && (
          <button className="btn-clear-filters" onClick={clearAllFilters}>
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="active-filters">
          <Filter size={14} />
          {statusFilter && (
            <span className="filter-pill">
              {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
              <button onClick={() => { setStatusFilter(""); setPage(0); }}>
                <X size={12} />
              </button>
            </span>
          )}
          {continentFilter && !locationFilter && (
            <span className="filter-pill">
              {continents.find((c) => c.id === continentFilter)?.name}
              <button onClick={() => { setContinentFilter(""); setPage(0); }}>
                <X size={12} />
              </button>
            </span>
          )}
          {locationFilter && (
            <span className="filter-pill">
              {locations.find((l) => l.id === locationFilter)?.name}
              <button onClick={() => { setLocationFilter(""); setPage(0); }}>
                <X size={12} />
              </button>
            </span>
          )}
          {startDateFilter && (
            <span className="filter-pill">
              From: {startDateFilter}
              <button onClick={() => { setStartDateFilter(""); setPage(0); }}>
                <X size={12} />
              </button>
            </span>
          )}
          {endDateFilter && (
            <span className="filter-pill">
              To: {endDateFilter}
              <button onClick={() => { setEndDateFilter(""); setPage(0); }}>
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Events Cards */}
      {loading && events.length === 0 ? (
        <div className="events-loading">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="no-results-card">No events found</div>
      ) : (
        <div className="events-card-grid">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-card-image-wrap">
                {event.eventImage ? (
                  <img src={event.eventImage} alt={event.name} className="event-card-image" />
                ) : (
                  <div className="event-card-image event-card-image-placeholder">
                    <Calendar size={28} color="#d1d5db" />
                  </div>
                )}
                <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[event.status] }}>
                  {event.status}
                </span>
                {event.isPrivate && <span className="private-badge-overlay">Private</span>}
              </div>
              <div className="event-card-body">
                <h3 className="event-card-name">{event.name}</h3>
                <div className="event-card-owner">
                  <span>{event.ownerName}</span>
                </div>
                <div className="event-card-meta">
                  <span className="event-card-date">
                    <Calendar size={13} />
                    {formatDate(event.startDateTime)}
                  </span>
                  {event.locationNames && event.locationNames.length > 0 && (
                    <span className="event-card-location">
                      <MapPin size={13} />
                      {event.locationNames[0]}
                      {event.locationNames.length > 1 && ` +${event.locationNames.length - 1}`}
                    </span>
                  )}
                </div>
                <div className="event-card-footer">
                  <div className="event-card-stats">
                    <span className="event-card-stat"><Ticket size={13} /> {event.ticketCount}</span>
                    <span className="event-card-stat"><Users size={13} /> {event.guestCount}</span>
                  </div>
                  <div className="event-card-actions">
                    <button className="btn-icon-sm" onClick={() => openEditModal(event)} title="Edit">
                      <Edit2 size={15} />
                    </button>
                    <button className="btn-icon-sm btn-icon-danger" onClick={() => openDeleteModal(event)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
      {showEditModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Event</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label>Event Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Event name"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Event description"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as EventStatus)}
              >
                {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-info">
              <p>
                <strong>Owner:</strong> {selectedEvent.ownerName} ({selectedEvent.ownerEmail})
              </p>
              <p>
                <strong>Created:</strong> {formatDate(selectedEvent.createdAt)}
              </p>
              <p>
                <strong>Tickets:</strong> {selectedEvent.ticketCount} | <strong>Guests:</strong> {selectedEvent.guestCount}
              </p>
              {selectedEvent.locationNames && selectedEvent.locationNames.length > 0 && (
                <p>
                  <strong>Locations:</strong> {selectedEvent.locationNames.join(", ")}
                </p>
              )}
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
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Event</h2>
              <button
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="delete-warning">
              <AlertCircle size={48} color="#ef4444" />
              <p>Are you sure you want to delete this event?</p>
              <p className="event-delete-name">{selectedEvent.name}</p>
              {selectedEvent.guestCount > 0 && (
                <p className="delete-note">
                  This event has {selectedEvent.guestCount} registered guest(s).
                  The event will be cancelled instead of permanently deleted.
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
                {submitting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsScreen;
