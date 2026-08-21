import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Store, X } from "lucide-react";
import type { RestaurantResponse } from "../services/restaurant.service";
import { getAllRestaurants } from "../services/restaurant.service";

interface RestaurantPickerProps {
  value: string | null;
  onChange: (restaurantId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const RestaurantPicker: React.FC<RestaurantPickerProps> = ({
  value,
  onChange,
  placeholder = "All restaurants",
  disabled = false,
}) => {
  const [restaurants, setRestaurants] = useState<RestaurantResponse[]>([]);
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      width: Math.max(rect.width, 280),
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
    } else {
      setFilterText("");
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

  const selected = restaurants.find((r) => r.id === value) ?? null;

  const filtered = restaurants.filter(
    (r) =>
      r.restaurant_name?.toLowerCase().includes(filterText.toLowerCase()) ||
      r.id?.toLowerCase().includes(filterText.toLowerCase())
  );

  const select = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  const triggerLabel = loading
    ? "Loading restaurants..."
    : error
      ? error
      : selected
        ? selected.restaurant_name
        : value
          ? value
          : placeholder;

  const isPlaceholder = !loading && !error && !value;

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden"
        >
          <div className="relative border-b border-gray-200">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search restaurants..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => select(null)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                value ? "text-gray-600" : "bg-blue-50 text-blue-700 font-semibold"
              }`}
            >
              All restaurants
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                {filterText ? "No results" : "No restaurants"}
              </div>
            ) : (
              filtered.map((r) => {
                const sel = r.id === value;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => select(r.id)}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      sel ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"
                    }`}
                  >
                    <span className="flex-1 truncate">{r.restaurant_name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        r.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
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
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading || !!error}
        onClick={() => setOpen(!open)}
        className={`mt-1 w-64 flex items-center gap-2 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-left bg-white disabled:bg-gray-50 disabled:cursor-not-allowed ${
          open ? "border-blue-500" : ""
        }`}
      >
        <Store size={16} className="text-gray-400 shrink-0" />
        <span
          className={`flex-1 truncate font-normal ${
            isPlaceholder ? "text-gray-400" : "text-gray-900"
          }`}
        >
          {triggerLabel}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear restaurant filter"
            onClick={(e) => {
              e.stopPropagation();
              select(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                select(null);
              }
            }}
            className="text-gray-400 hover:text-gray-700 shrink-0"
          >
            <X size={14} />
          </span>
        ) : (
          <ChevronDown
            size={16}
            className={`text-gray-400 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {dropdown}
    </div>
  );
};

export default RestaurantPicker;
