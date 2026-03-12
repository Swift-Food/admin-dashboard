import React, { useState, useEffect, useRef } from "react";
import { X, Check, Search, ChevronDown, Store } from "lucide-react";
import type { RestaurantResponse } from "../services/restaurant.service";
import { getAllRestaurants } from "../services/restaurant.service";

interface RestaurantMultiSelectProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
}

const RestaurantMultiSelect: React.FC<RestaurantMultiSelectProps> = ({
  selectedIds,
  onChange,
  disabled = false,
}) => {
  const [restaurants, setRestaurants] = useState<RestaurantResponse[]>([]);
  const [filterText, setFilterText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllRestaurants()
      .then((data) => {
        setRestaurants(data || []);
        setError(null);
      })
      .catch(() => setError("Failed to load restaurants"))
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const selectedRestaurants = restaurants.filter((r) =>
    selectedIds.includes(r.id)
  );

  const filtered = restaurants.filter(
    (r) =>
      r.restaurant_name?.toLowerCase().includes(filterText.toLowerCase()) ||
      r.id?.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return (
      <div className="rms-trigger rms-trigger-disabled">
        <span className="rms-trigger-text rms-placeholder">Loading restaurants...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rms-trigger rms-trigger-error">
        <span className="rms-trigger-text">{error}</span>
      </div>
    );
  }

  return (
    <div className="rms" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        className={`rms-trigger ${open ? "rms-trigger-open" : ""} ${disabled ? "rms-trigger-disabled" : ""}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <Store size={16} className="rms-trigger-icon" />
        {selectedIds.length === 0 ? (
          <span className="rms-trigger-text rms-placeholder">
            All restaurants (no restriction)
          </span>
        ) : (
          <span className="rms-trigger-text">
            {selectedIds.length} restaurant{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
        )}
        <ChevronDown
          size={16}
          className={`rms-chevron ${open ? "rms-chevron-open" : ""}`}
        />
      </button>

      {/* Selected tags */}
      {selectedRestaurants.length > 0 && (
        <div className="rms-tags">
          {selectedRestaurants.map((r) => (
            <span key={r.id} className="rms-tag">
              {r.restaurant_name}
              <button
                type="button"
                className="rms-tag-remove"
                onClick={() => toggle(r.id)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="rms-clear-all"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="rms-dropdown">
          <div className="rms-search-wrap">
            <Search size={14} className="rms-search-icon" />
            <input
              ref={searchRef}
              type="text"
              className="rms-search"
              placeholder="Search restaurants..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>

          <div className="rms-actions-bar">
            <button
              type="button"
              className="rms-action-btn"
              onClick={() =>
                onChange(
                  selectedIds.length === restaurants.length
                    ? []
                    : restaurants.map((r) => r.id)
                )
              }
            >
              {selectedIds.length === restaurants.length
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>

          <div className="rms-list">
            {filtered.length === 0 ? (
              <div className="rms-empty">
                {filterText ? "No results" : "No restaurants"}
              </div>
            ) : (
              filtered.map((r) => {
                const sel = selectedIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`rms-item ${sel ? "rms-item-selected" : ""}`}
                    onClick={() => toggle(r.id)}
                  >
                    <span className={`rms-check ${sel ? "rms-check-on" : ""}`}>
                      {sel && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="rms-item-name">{r.restaurant_name}</span>
                    <span
                      className={`rms-item-status ${
                        r.status === "active"
                          ? "rms-status-active"
                          : "rms-status-inactive"
                      }`}
                    >
                      {r.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMultiSelect;
