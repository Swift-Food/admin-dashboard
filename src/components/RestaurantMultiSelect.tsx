import React, { useState, useEffect, useRef } from "react";
import { X, Check, Search } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const data = await getAllRestaurants();
        console.log("Fetched restaurants:", data);
        setRestaurants(data || []);
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
    if (disabled) return;
    if (selectedIds.includes(restaurantId)) {
      onChange(selectedIds.filter((id) => id !== restaurantId));
    } else {
      onChange([...selectedIds, restaurantId]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    if (selectedIds.length === restaurants.length) {
      onChange([]);
    } else {
      onChange(restaurants.map((r) => r.id));
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.restaurant_name?.toLowerCase().includes(filterText.toLowerCase()) ||
      r.id?.toLowerCase().includes(filterText.toLowerCase())
  );

  const selectedRestaurants = restaurants.filter((r) =>
    selectedIds.includes(r.id)
  );

  if (loading) {
    return (
      <div className="restaurant-select-container">
        <label className="restaurant-select-label">
          Restaurants <span className="label-hint">(Leave empty for all)</span>
        </label>
        <div className="restaurant-select-loading">
          <div className="spinner-small"></div>
          <span>Loading restaurants...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="restaurant-select-container">
        <label className="restaurant-select-label">Restaurants</label>
        <div className="restaurant-select-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="restaurant-select-container" ref={containerRef}>
      <div className="restaurant-select-header">
        <label className="restaurant-select-label">
          Restaurants <span className="label-hint">(Leave empty for all)</span>
        </label>
        <div className="restaurant-select-actions">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="btn-link"
          >
            {selectedIds.length === restaurants.length ? "Deselect All" : "Select All"}
          </button>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={disabled}
              className="btn-link btn-link-danger"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selected Tags */}
      {selectedRestaurants.length > 0 && (
        <div className="selected-tags">
          {selectedRestaurants.map((restaurant) => (
            <span key={restaurant.id} className="selected-tag">
              {restaurant.restaurant_name}
              <button
                type="button"
                onClick={() => handleRestaurantToggle(restaurant.id)}
                disabled={disabled}
                className="tag-remove"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="restaurant-search">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search restaurants..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="search-input"
          disabled={disabled}
        />
      </div>

      {/* Restaurant List */}
      <div className="restaurant-list">
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((restaurant) => {
            const isSelected = selectedIds.includes(restaurant.id);
            return (
              <label
                key={restaurant.id}
                className={`restaurant-item ${isSelected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
              >
                <div className={`checkbox ${isSelected ? "checked" : ""}`}>
                  {isSelected && <Check size={12} />}
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleRestaurantToggle(restaurant.id)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span className="restaurant-name">{restaurant.restaurant_name}</span>
                <span className={`status-badge ${restaurant.isOpen ? "open" : "closed"}`}>
                  {restaurant.isOpen ? "Open" : "Closed"}
                </span>
              </label>
            );
          })
        ) : (
          <div className="no-results">
            {filterText ? "No restaurants match your search" : "No restaurants available"}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantMultiSelect;
