import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    getAllRestaurants()
      .then((data) => {
        setRestaurants(data || []);
        setError(null);
      })
      .catch(() => setError("Failed to load restaurants"))
      .finally(() => setLoading(false));
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search + position dropdown when opened
  useEffect(() => {
    if (open) {
      updateDropdownPosition();
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open, updateDropdownPosition]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const handler = () => updateDropdownPosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, updateDropdownPosition]);

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
        <Store size={16} className="rms-trigger-icon" />
        <span className="rms-trigger-text rms-placeholder">
          Loading restaurants...
        </span>
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

  const dropdown = open
    ? createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="rms-dropdown">
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
                    <span
                      className={`rms-check ${sel ? "rms-check-on" : ""}`}
                    >
                      {sel ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className="rms-item-name">
                      {r.restaurant_name}
                    </span>
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
        </div>,
        document.body
      )
    : null;

  return (
    <div className="rms" ref={containerRef}>
      {/* Trigger */}
      <button
        ref={triggerRef}
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
            {selectedIds.length} restaurant
            {selectedIds.length !== 1 ? "s" : ""} selected
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

      {/* Dropdown via portal */}
      {dropdown}
    </div>
  );
};

export default RestaurantMultiSelect;
