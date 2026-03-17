import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  ImageOff,
  ChevronDown,
  ChevronRight,
  Globe,
  Save,
  X,
  MoreVertical,
} from "lucide-react";
import eventLocationService from "../../services/event-location.service";
import eventContinentService from "../../services/event-continent.service";
import type {
  EventLocation,
  EventContinent,
  CreateEventLocationDto,
} from "../../types/event-location.types";
import LocationFormModal from "../../components/LocationFormModal/LocationFormModal";
import DeleteLocationConfirmModal from "../../components/DeleteLocationConfirmModal/DeleteLocationConfirmModal";
import "./EventLocationsScreen.css";

const EventLocationsScreen: React.FC = () => {
  const [locations, setLocations] = useState<EventLocation[]>([]);
  const [continents, setContinents] = useState<EventContinent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Expanded continent sections
  const [expandedContinents, setExpandedContinents] = useState<Set<string>>(new Set());

  // Location modals
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<EventLocation | null>(null);
  const [addForContinentId, setAddForContinentId] = useState<string | undefined>();

  // Inline continent editing
  const [editingContinentId, setEditingContinentId] = useState<string | null>(null);
  const [editContinentName, setEditContinentName] = useState("");
  const [editContinentOrder, setEditContinentOrder] = useState("");

  // Add new continent
  const [showAddContinent, setShowAddContinent] = useState(false);
  const [newContinentName, setNewContinentName] = useState("");

  // Continent menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openMenuId && !(e.target as HTMLElement).closest(".el-continent-menu-wrap")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [locs, conts] = await Promise.all([
        eventLocationService.getAllLocations(),
        eventContinentService.getAllContinents(),
      ]);
      setLocations(locs);
      setContinents(conts);
      // Auto-expand continents that have locations
      const withLocs = new Set(locs.map((l) => l.continentId));
      setExpandedContinents(withLocs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Group locations by continent
  const locationsByContinent = locations.reduce<Record<string, EventLocation[]>>((acc, loc) => {
    const key = loc.continentId || "uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(loc);
    return acc;
  }, {});

  const toggleContinent = (id: string) => {
    setExpandedContinents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Location CRUD ---
  const handleCreateLocation = async (data: CreateEventLocationDto) => {
    try {
      setSubmitting(true);
      const created = await eventLocationService.createLocation(data);
      setLocations((prev) => [created, ...prev]);
      setShowAddLocation(false);
      setAddForContinentId(undefined);
      // Expand the continent section
      setExpandedContinents((prev) => new Set([...prev, created.continentId]));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLocation = async (data: CreateEventLocationDto) => {
    if (!selectedLocation) return;
    try {
      setSubmitting(true);
      const updated = await eventLocationService.updateLocation(selectedLocation.id, data);
      setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setShowEditLocation(false);
      setSelectedLocation(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async () => {
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

  const openEditLocation = (loc: EventLocation) => {
    setSelectedLocation(loc);
    setShowEditLocation(true);
  };

  const openDeleteLocation = (loc: EventLocation) => {
    setSelectedLocation(loc);
    setShowDeleteConfirm(true);
  };

  const openAddForContinent = (continentId: string) => {
    setAddForContinentId(continentId);
    setShowAddLocation(true);
  };

  // --- Continent CRUD ---
  const handleCreateContinent = async () => {
    if (!newContinentName.trim()) return;
    try {
      setSubmitting(true);
      const created = await eventContinentService.createContinent({
        name: newContinentName.trim(),
        displayOrder: continents.length,
      });
      setContinents((prev) => [...prev, created].sort((a, b) => a.displayOrder - b.displayOrder));
      setShowAddContinent(false);
      setNewContinentName("");
      setExpandedContinents((prev) => new Set([...prev, created.id]));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create continent");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditContinent = (c: EventContinent) => {
    setEditingContinentId(c.id);
    setEditContinentName(c.name);
    setEditContinentOrder(String(c.displayOrder));
    setOpenMenuId(null);
  };

  const cancelEditContinent = () => {
    setEditingContinentId(null);
    setEditContinentName("");
    setEditContinentOrder("");
  };

  const handleUpdateContinent = async () => {
    if (!editingContinentId || !editContinentName.trim()) return;
    try {
      setSubmitting(true);
      const updated = await eventContinentService.updateContinent(editingContinentId, {
        name: editContinentName.trim(),
        displayOrder: parseInt(editContinentOrder, 10) || 0,
      });
      setContinents((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.displayOrder - b.displayOrder)
      );
      cancelEditContinent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update continent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContinent = async (c: EventContinent) => {
    const locCount = (locationsByContinent[c.id] || []).length;
    if (locCount > 0) {
      alert(`Cannot delete "${c.name}" — it has ${locCount} location${locCount !== 1 ? "s" : ""} assigned.`);
      return;
    }
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await eventContinentService.deleteContinent(c.id);
      setContinents((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete continent");
    }
    setOpenMenuId(null);
  };

  if (loading) {
    return (
      <div className="el-loading">
        <div className="spinner" />
        <p>Loading locations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="el-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchAll}>
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
            <Globe size={22} className="el-header-icon" />
            Event Locations
          </h1>
          <p>Manage cities grouped by continent</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setAddForContinentId(undefined); setShowAddLocation(true); }}>
          <Plus size={18} /> Add City
        </button>
      </div>

      {continents.length === 0 && locations.length === 0 ? (
        <div className="el-empty">
          <Globe size={48} className="el-empty-icon" />
          <p>No continents or locations yet</p>
          <span>Start by adding a continent, then add cities within it.</span>
          <button className="btn btn-primary" onClick={() => setShowAddContinent(true)}>
            <Plus size={16} /> Add Continent
          </button>
        </div>
      ) : (
        <div className="el-sections">
          {continents.map((continent) => {
            const contLocs = locationsByContinent[continent.id] || [];
            const isExpanded = expandedContinents.has(continent.id);
            const isEditing = editingContinentId === continent.id;

            return (
              <div key={continent.id} className="el-continent-section">
                {/* Continent Header */}
                <div className={`el-continent-header ${isExpanded ? "el-continent-header--expanded" : ""}`}>
                  {isEditing ? (
                    <div className="el-continent-edit-row">
                      <input
                        type="text"
                        value={editContinentName}
                        onChange={(e) => setEditContinentName(e.target.value)}
                        placeholder="Continent name"
                        className="el-continent-edit-input"
                        autoFocus
                      />
                      <label className="el-continent-order-label">
                        Order:
                        <input
                          type="number"
                          value={editContinentOrder}
                          onChange={(e) => setEditContinentOrder(e.target.value)}
                          className="el-continent-order-input"
                        />
                      </label>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={handleUpdateContinent}
                        disabled={submitting || !editContinentName.trim()}
                      >
                        <Save size={14} /> Save
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={cancelEditContinent}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="el-continent-toggle"
                        onClick={() => toggleContinent(continent.id)}
                      >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <span className="el-continent-name">{continent.name}</span>
                        <span className="el-continent-count">
                          {contLocs.length} {contLocs.length === 1 ? "city" : "cities"}
                        </span>
                      </button>
                      <div className="el-continent-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openAddForContinent(continent.id)}
                          title={`Add city to ${continent.name}`}
                        >
                          <Plus size={14} /> Add City
                        </button>
                        <div className="el-continent-menu-wrap">
                          <button
                            className="el-continent-menu-btn"
                            onClick={() => setOpenMenuId(openMenuId === continent.id ? null : continent.id)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === continent.id && (
                            <div className="el-continent-menu">
                              <button onClick={() => startEditContinent(continent)}>
                                <Edit2 size={14} /> Rename
                              </button>
                              <button
                                onClick={() => handleDeleteContinent(continent)}
                                className={contLocs.length > 0 ? "el-menu-disabled" : "el-menu-danger"}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Location Cards */}
                {isExpanded && (
                  <div className="el-locations-grid">
                    {contLocs.length === 0 ? (
                      <div className="el-no-cities">
                        <MapPin size={16} />
                        <span>No cities yet</span>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => openAddForContinent(continent.id)}
                        >
                          <Plus size={14} /> Add one
                        </button>
                      </div>
                    ) : (
                      contLocs.map((loc) => (
                        <div key={loc.id} className="el-location-card">
                          <div className="el-card-image">
                            {loc.image ? (
                              <img src={loc.image} alt={loc.name} />
                            ) : (
                              <div className="el-card-no-image">
                                <ImageOff size={20} />
                              </div>
                            )}
                          </div>
                          <div className="el-card-body">
                            <span className="el-card-name">{loc.name}</span>
                            <span className={`el-card-events ${loc.eventCount > 0 ? "el-card-events--active" : ""}`}>
                              {loc.eventCount} event{loc.eventCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="el-card-actions">
                            <button
                              className="el-card-action-btn"
                              onClick={() => openEditLocation(loc)}
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className={`el-card-action-btn ${loc.eventCount > 0 ? "el-card-action-btn--disabled" : "el-card-action-btn--danger"}`}
                              onClick={() => loc.eventCount === 0 && openDeleteLocation(loc)}
                              title={loc.eventCount > 0 ? "Cannot delete — has events" : "Delete"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Continent */}
          {showAddContinent ? (
            <div className="el-add-continent-row">
              <Globe size={16} className="el-add-continent-icon" />
              <input
                type="text"
                value={newContinentName}
                onChange={(e) => setNewContinentName(e.target.value)}
                placeholder="New continent name..."
                className="el-add-continent-input"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateContinent()}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={handleCreateContinent}
                disabled={submitting || !newContinentName.trim()}
              >
                <Save size={14} /> {submitting ? "Saving..." : "Save"}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setShowAddContinent(false); setNewContinentName(""); }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              className="el-add-continent-btn"
              onClick={() => setShowAddContinent(true)}
            >
              <Plus size={16} /> Add Continent
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <LocationFormModal
        isOpen={showAddLocation}
        mode="add"
        defaultContinentId={addForContinentId}
        isSubmitting={submitting}
        onSubmit={handleCreateLocation}
        onClose={() => { setShowAddLocation(false); setAddForContinentId(undefined); }}
      />

      <LocationFormModal
        isOpen={showEditLocation}
        mode="edit"
        initialData={selectedLocation ?? undefined}
        isSubmitting={submitting}
        onSubmit={handleUpdateLocation}
        onClose={() => { setShowEditLocation(false); setSelectedLocation(null); }}
      />

      <DeleteLocationConfirmModal
        isOpen={showDeleteConfirm}
        location={selectedLocation}
        isDeleting={deleting}
        onConfirm={handleDeleteLocation}
        onCancel={() => { setShowDeleteConfirm(false); setSelectedLocation(null); }}
      />
    </div>
  );
};

export default EventLocationsScreen;
