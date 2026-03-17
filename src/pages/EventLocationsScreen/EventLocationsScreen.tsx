import React, { useState, useEffect } from "react";
import { AlertCircle, Plus, Trash2, Edit2, MapPin, ImageOff } from "lucide-react";
import eventLocationService from "../../services/event-location.service";
import type { EventLocation, CreateEventLocationDto } from "../../types/event-location.types";
import LocationFormModal from "../../components/LocationFormModal/LocationFormModal";
import DeleteLocationConfirmModal from "../../components/DeleteLocationConfirmModal/DeleteLocationConfirmModal";
import "./EventLocationsScreen.css";

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCoord = (n: number, decimals = 4): string =>
  n.toFixed(decimals);

const EventLocationsScreen: React.FC = () => {
  const [locations, setLocations] = useState<EventLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal visibility
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Selected location
  const [selectedLocation, setSelectedLocation] = useState<EventLocation | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await eventLocationService.getAllLocations();
      setLocations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateEventLocationDto) => {
    try {
      setSubmitting(true);
      const created = await eventLocationService.createLocation(data);
      setLocations((prev) => [created, ...prev]);
      setShowAdd(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: CreateEventLocationDto) => {
    if (!selectedLocation) return;
    try {
      setSubmitting(true);
      const updated = await eventLocationService.updateLocation(selectedLocation.id, data);
      setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setShowEdit(false);
      setSelectedLocation(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (location: EventLocation) => {
    setSelectedLocation(location);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLocation) return;
    try {
      setDeleting(true);
      await eventLocationService.deleteLocation(selectedLocation.id);
      setLocations((prev) => prev.filter((l) => l.id !== selectedLocation.id));
      setShowDeleteConfirm(false);
      setSelectedLocation(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete location");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (location: EventLocation) => {
    setSelectedLocation(location);
    setShowEdit(true);
  };

  if (loading) {
    return (
      <div className="el-loading">
        <div className="spinner" />
        <p>Loading event locations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="el-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchLocations}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="el-container">
      <div className="el-header">
        <div>
          <h1>
            <MapPin size={22} className="el-header-icon" />
            Event Locations
          </h1>
          <p>Manage geographic bounds for event locations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="el-empty">
          <MapPin size={48} className="el-empty-icon" />
          <p>No locations yet</p>
          <span>Add your first event location to get started.</span>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Location
          </button>
        </div>
      ) : (
        <div className="el-table-wrap">
          <table className="el-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Continent</th>
                <th>Image</th>
                <th>Lat Bounds</th>
                <th>Lng Bounds</th>
                <th>Events</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td>
                    <span className="el-loc-name">{loc.name}</span>
                    <span className="el-loc-id">{loc.id.slice(0, 8)}…</span>
                  </td>
                  <td>{loc.continentName || "—"}</td>
                  <td>
                    {loc.image ? (
                      <img
                        src={loc.image}
                        alt={loc.name}
                        className="el-thumb"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                          (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute("style");
                        }}
                      />
                    ) : (
                      <div className="el-no-image">
                        <ImageOff size={16} />
                      </div>
                    )}
                    {loc.image && (
                      <div className="el-no-image" style={{ display: "none" }}>
                        <ImageOff size={16} />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="el-bounds">
                      <span>{formatCoord(loc.minLat)}°</span>
                      <span className="el-bounds-sep">→</span>
                      <span>{formatCoord(loc.maxLat)}°</span>
                    </div>
                  </td>
                  <td>
                    <div className="el-bounds">
                      <span>{formatCoord(loc.minLng)}°</span>
                      <span className="el-bounds-sep">→</span>
                      <span>{formatCoord(loc.maxLng)}°</span>
                    </div>
                  </td>
                  <td>
                    <span className={`el-event-badge ${loc.eventCount > 0 ? "el-event-badge--active" : "el-event-badge--zero"}`}>
                      {loc.eventCount} event{loc.eventCount !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="el-date">{formatDate(loc.createdAt)}</td>
                  <td>
                    <div className="el-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEdit(loc)}
                        title="Edit location"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        className={`btn btn-sm ${loc.eventCount > 0 ? "btn-danger-disabled" : "btn-danger"}`}
                        onClick={() => handleDeleteClick(loc)}
                        title={loc.eventCount > 0 ? "Cannot delete — location has events" : "Delete location"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LocationFormModal
        isOpen={showAdd}
        mode="add"
        isSubmitting={submitting}
        onSubmit={handleCreate}
        onClose={() => setShowAdd(false)}
      />

      <LocationFormModal
        isOpen={showEdit}
        mode="edit"
        initialData={selectedLocation ?? undefined}
        isSubmitting={submitting}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEdit(false);
          setSelectedLocation(null);
        }}
      />

      <DeleteLocationConfirmModal
        isOpen={showDeleteConfirm}
        location={selectedLocation}
        isDeleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedLocation(null);
        }}
      />
    </div>
  );
};

export default EventLocationsScreen;
