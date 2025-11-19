import React, { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import type { RestaurantResponse } from "../services/restaurant.service";
import { getAllRestaurantsAdminDashboard } from "../services/restaurant.service";

interface RestaurantMultiSelectProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const RestaurantMultiSelect: React.FC<RestaurantMultiSelectProps> = ({
  selectedIds,
  onChange,
  disabled = false,
  isLoading = false,
}) => {
  const [restaurants, setRestaurants] = useState<RestaurantResponse[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const data = await getAllRestaurantsAdminDashboard();
        setRestaurants(data);
        setError(null);
      } catch (err) {
        setError("Failed to load restaurants");
        console.error("Failed to fetch restaurants:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handleRestaurantToggle = (restaurantId: string) => {
    if (selectedIds.includes(restaurantId)) {
      onChange(selectedIds.filter((id) => id !== restaurantId));
    } else {
      onChange([...selectedIds, restaurantId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === restaurants.length) {
      onChange([]);
    } else {
      onChange(restaurants.map((r) => r.id));
    }
  };

  const handleRemoveTag = (restaurantId: string) => {
    onChange(selectedIds.filter((id) => id !== restaurantId));
  };

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.restaurant_name.toLowerCase().includes(filterText.toLowerCase()) ||
      r.id.toLowerCase().includes(filterText.toLowerCase())
  );

  const selectedRestaurants = restaurants.filter((r) =>
    selectedIds.includes(r.id)
  );

  return (
    <div className="form-group">
      <label className="form-label">
        Restaurants (Leave empty to apply to all)
      </label>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.375rem",
            color: "#b91c1c",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Selected Tags */}
      {selectedRestaurants.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            minHeight: "2rem",
          }}
        >
          {selectedRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.75rem",
                backgroundColor: "#dbeafe",
                border: "1px solid #bfdbfe",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                color: "#1e40af",
              }}
            >
              <span>{restaurant.restaurant_name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(restaurant.id)}
                disabled={disabled}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: disabled ? "not-allowed" : "pointer",
                  color: "inherit",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Button */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled || loading || isLoading}
          style={{
            width: "100%",
            padding: "0.625rem 0.875rem",
            border: isDropdownOpen ? "2px solid #2563eb" : "1px solid #d1d5db",
            borderRadius: "0.5rem",
            backgroundColor: "white",
            fontSize: "0.875rem",
            color: "#374151",
            cursor: disabled || loading || isLoading ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            textAlign: "left",
            transition: "all 0.15s",
          }}
        >
          <span style={{ opacity: loading || isLoading ? 0.6 : 1 }}>
            {loading || isLoading
              ? "Loading restaurants..."
              : `${selectedIds.length} restaurant${selectedIds.length !== 1 ? "s" : ""} selected`}
          </span>
          <ChevronDown
            size={18}
            style={{
              transition: "transform 0.15s",
              transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderTopWidth: 0,
              borderRadius: "0 0 0.5rem 0.5rem",
              zIndex: 40,
              maxHeight: "300px",
              overflowY: "auto",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Search Input */}
            <div style={{ padding: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
              <input
                type="text"
                placeholder="Search restaurants..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem 0.875rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            {/* Select All Button */}
            <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e5e7eb" }}>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={disabled}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  backgroundColor:
                    selectedIds.length === restaurants.length
                      ? "#fee2e2"
                      : "#dbeafe",
                  color:
                    selectedIds.length === restaurants.length
                      ? "#991b1b"
                      : "#1e40af",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: disabled ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {selectedIds.length === restaurants.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {/* Restaurant List */}
            <div style={{ maxHeight: "250px", overflowY: "auto" }}>
              {filteredRestaurants.length > 0 ? (
                filteredRestaurants.map((restaurant) => (
                  <label
                    key={restaurant.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      borderBottom: "1px solid #f3f4f6",
                      cursor: disabled ? "not-allowed" : "pointer",
                      backgroundColor: selectedIds.includes(restaurant.id)
                        ? "#f0f9ff"
                        : "transparent",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!disabled) {
                        e.currentTarget.style.backgroundColor =
                          selectedIds.includes(restaurant.id) ? "#e0f2fe" : "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = selectedIds.includes(
                        restaurant.id
                      )
                        ? "#f0f9ff"
                        : "transparent";
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(restaurant.id)}
                      onChange={() => handleRestaurantToggle(restaurant.id)}
                      disabled={disabled}
                      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {restaurant.restaurant_name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {restaurant.id}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.25rem 0.5rem",
                        backgroundColor: restaurant.isOpen ? "#dcfce7" : "#fee2e2",
                        color: restaurant.isOpen ? "#166534" : "#991b1b",
                        borderRadius: "0.25rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {restaurant.isOpen ? "Open" : "Closed"}
                    </div>
                  </label>
                ))
              ) : (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "0.875rem",
                  }}
                >
                  {loading ? "Loading..." : "No restaurants found"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
          }}
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default RestaurantMultiSelect;
