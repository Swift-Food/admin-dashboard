import React, { useState, useEffect } from "react";
import { AlertCircle, Plus, Trash2, Edit2, Globe, Save, X } from "lucide-react";
import eventContinentService from "../../services/event-continent.service";
import type { EventContinent } from "../../types/event-location.types";

const EventContinentsScreen: React.FC = () => {
  const [continents, setContinents] = useState<EventContinent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState("");

  // Add new
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState("0");

  useEffect(() => {
    fetchContinents();
  }, []);

  const fetchContinents = async () => {
    try {
      setLoading(true);
      const data = await eventContinentService.getAllContinents();
      setContinents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load continents");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      setSubmitting(true);
      const created = await eventContinentService.createContinent({
        name: newName.trim(),
        displayOrder: parseInt(newOrder, 10) || 0,
      });
      setContinents((prev) => [...prev, created].sort((a, b) => a.displayOrder - b.displayOrder));
      setShowAdd(false);
      setNewName("");
      setNewOrder("0");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create continent");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: EventContinent) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditOrder(String(c.displayOrder));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditOrder("");
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      setSubmitting(true);
      const updated = await eventContinentService.updateContinent(editingId, {
        name: editName.trim(),
        displayOrder: parseInt(editOrder, 10) || 0,
      });
      setContinents((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.displayOrder - b.displayOrder)
      );
      cancelEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update continent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: EventContinent) => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await eventContinentService.deleteContinent(c.id);
      setContinents((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete continent");
    }
  };

  if (loading) {
    return (
      <div className="el-loading">
        <div className="spinner" />
        <p>Loading continents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="el-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchContinents}>
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
            Event Continents
          </h1>
          <p>Manage continent groupings for event locations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Continent
        </button>
      </div>

      <div className="el-table-wrap">
        <table className="el-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Display Order</th>
              <th>Locations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {showAdd && (
              <tr>
                <td>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Continent name"
                    autoFocus
                    style={{ width: "100%", padding: "4px 8px" }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                    style={{ width: 60, padding: "4px 8px" }}
                  />
                </td>
                <td>-</td>
                <td>
                  <div className="el-actions">
                    <button className="btn btn-sm btn-primary" onClick={handleCreate} disabled={submitting || !newName.trim()}>
                      <Save size={14} /> {submitting ? "Saving..." : "Save"}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setShowAdd(false); setNewName(""); setNewOrder("0"); }}>
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {continents.map((c) => (
              <tr key={c.id}>
                <td>
                  {editingId === c.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ width: "100%", padding: "4px 8px" }}
                    />
                  ) : (
                    <span className="el-loc-name">{c.name}</span>
                  )}
                </td>
                <td>
                  {editingId === c.id ? (
                    <input
                      type="number"
                      value={editOrder}
                      onChange={(e) => setEditOrder(e.target.value)}
                      style={{ width: 60, padding: "4px 8px" }}
                    />
                  ) : (
                    c.displayOrder
                  )}
                </td>
                <td>
                  <span className={`el-event-badge ${c.locationCount > 0 ? "el-event-badge--active" : "el-event-badge--zero"}`}>
                    {c.locationCount} location{c.locationCount !== 1 ? "s" : ""}
                  </span>
                </td>
                <td>
                  <div className="el-actions">
                    {editingId === c.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={handleUpdate} disabled={submitting || !editName.trim()}>
                          <Save size={14} /> {submitting ? "Saving..." : "Save"}
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => startEdit(c)} title="Edit">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          className={`btn btn-sm ${c.locationCount > 0 ? "btn-danger-disabled" : "btn-danger"}`}
                          onClick={() => handleDelete(c)}
                          disabled={c.locationCount > 0}
                          title={c.locationCount > 0 ? "Cannot delete — has locations assigned" : "Delete"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventContinentsScreen;
