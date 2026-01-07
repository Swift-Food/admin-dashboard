import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";

// Icon categories with keyword patterns
const ICON_CATEGORIES: Record<string, string[]> = {
  All: [],
  Arrows: ["arrow", "chevron", "move", "corner", "direction"],
  Media: ["play", "pause", "stop", "volume", "music", "video", "camera", "image", "film", "mic", "speaker", "headphone"],
  Files: ["file", "folder", "document", "book", "clipboard", "archive", "save"],
  Communication: ["mail", "message", "phone", "chat", "bell", "inbox", "send"],
  UI: ["menu", "grid", "list", "layout", "panel", "sidebar", "tab", "window", "modal"],
  Users: ["user", "users", "person", "people", "contact", "account"],
  Commerce: ["cart", "shop", "bag", "credit", "dollar", "wallet", "receipt", "tag", "percent"],
  Weather: ["sun", "moon", "cloud", "rain", "snow", "wind", "thermometer", "umbrella"],
  Travel: ["car", "plane", "train", "bus", "bike", "ship", "truck", "map", "compass", "globe", "navigation"],
  Food: ["coffee", "pizza", "apple", "cake", "utensil", "cup", "wine", "beer", "cookie", "salad", "soup"],
  Health: ["heart", "activity", "pill", "hospital", "stethoscope", "thermometer", "bandage", "syringe"],
  Tech: ["computer", "laptop", "monitor", "keyboard", "mouse", "cpu", "server", "database", "wifi", "bluetooth", "usb", "code", "terminal", "git"],
  Social: ["share", "like", "thumb", "star", "bookmark", "flag", "award", "trophy"],
  Nature: ["tree", "leaf", "flower", "plant", "mountain", "wave", "flame", "zap"],
  Shapes: ["circle", "square", "triangle", "hexagon", "octagon", "star", "diamond"],
  Time: ["clock", "calendar", "timer", "watch", "alarm", "hourglass"],
  Security: ["lock", "unlock", "key", "shield", "eye", "fingerprint"],
  Tools: ["wrench", "hammer", "screwdriver", "scissors", "brush", "pen", "pencil", "ruler", "magnet"],
  Buildings: ["home", "building", "store", "factory", "warehouse", "hotel", "school", "church", "castle"],
};

// Get all icon names dynamically from lucide-react
const getAllIconNames = (): string[] => {
  const excluded = new Set([
    "createLucideIcon",
    "default",
    "IconNode",
    "LucideIcon",
    "LucideProps",
    "icons",
  ]);

  return Object.keys(LucideIcons).filter((key) => {
    if (excluded.has(key)) return false;
    if (key[0] !== key[0].toUpperCase()) return false;
    const value = (LucideIcons as any)[key];
    return value && (typeof value === "function" || typeof value === "object");
  });
};

interface LucideIconPickerProps {
  value: string | null;
  onChange: (iconName: string | null) => void;
  placeholder?: string;
}

const ICONS_PER_PAGE = 100;

const LucideIconPicker: React.FC<LucideIconPickerProps> = ({
  value,
  onChange,
  placeholder = "Select an icon...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(ICONS_PER_PAGE);

  const allIcons = useMemo(() => getAllIconNames(), []);

  const filteredIcons = useMemo(() => {
    let icons = allIcons;

    // Filter by category
    if (selectedCategory !== "All") {
      const keywords = ICON_CATEGORIES[selectedCategory] || [];
      icons = icons.filter((name) =>
        keywords.some((kw) => name.toLowerCase().includes(kw.toLowerCase()))
      );
    }

    // Filter by search
    if (search) {
      icons = icons.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return icons;
  }, [allIcons, search, selectedCategory]);

  // Reset visible count when filters change
  const displayedIcons = filteredIcons.slice(0, visibleCount);
  const hasMore = visibleCount < filteredIcons.length;

  const renderIcon = (iconName: string, size: number = 20) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={size} />;
  };

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch("");
    setSelectedCategory("All");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearch("");
    setSelectedCategory("All");
    setVisibleCount(ICONS_PER_PAGE);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setVisibleCount(ICONS_PER_PAGE);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(ICONS_PER_PAGE);
  };

  const loadMore = () => {
    setVisibleCount((prev) => prev + ICONS_PER_PAGE);
  };

  return (
    <>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          cursor: "pointer",
          background: "#fff",
          minHeight: 42,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {value ? (
            <>
              {renderIcon(value)}
              <span style={{ color: "#1e293b" }}>{value}</span>
            </>
          ) : (
            <span style={{ color: "#94a3b8" }}>{placeholder}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {value && (
            <button
              onClick={handleClear}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "#64748b",
                display: "flex",
              }}
            >
              <LucideIcons.X size={16} />
            </button>
          )}
          <LucideIcons.ChevronDown size={16} style={{ color: "#64748b" }} />
        </div>
      </div>

      {/* Full Screen Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "90%",
              maxWidth: 900,
              height: "80vh",
              maxHeight: 700,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1a1a2e" }}>
                  Select Icon
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
                  {allIcons.length} icons available
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  display: "flex",
                  color: "#6b7280",
                }}
              >
                <LucideIcons.X size={24} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ position: "relative" }}>
                <LucideIcons.Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 44px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    outline: "none",
                    fontSize: 15,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {Object.keys(ICON_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    background: selectedCategory === category ? "#3b82f6" : "#f3f4f6",
                    color: selectedCategory === category ? "#fff" : "#4b5563",
                    transition: "all 0.15s",
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Results count */}
            <div style={{ padding: "8px 24px", fontSize: 13, color: "#6b7280" }}>
              Showing {displayedIcons.length} of {filteredIcons.length} icons
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
              {search && ` matching "${search}"`}
            </div>

            {/* Icons Grid */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 24px 24px",
              }}
            >
              {filteredIcons.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 200,
                    color: "#9ca3af",
                  }}
                >
                  <LucideIcons.SearchX size={48} />
                  <p style={{ marginTop: 12 }}>No icons found</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                    gap: 8,
                  }}
                >
                  {displayedIcons.map((iconName) => (
                    <button
                      key={iconName}
                      onClick={() => handleSelect(iconName)}
                      title={iconName}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 12,
                        border: value === iconName ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: value === iconName ? "#eff6ff" : "#fff",
                        color: value === iconName ? "#1d4ed8" : "#374151",
                        transition: "all 0.15s",
                        minHeight: 80,
                      }}
                      onMouseEnter={(e) => {
                        if (value !== iconName) {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (value !== iconName) {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }
                      }}
                    >
                      {renderIcon(iconName, 28)}
                      <span
                        style={{
                          fontSize: 11,
                          marginTop: 6,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                        }}
                      >
                        {iconName}
                      </span>
                    </button>
                  ))}
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      style={{
                        gridColumn: "1 / -1",
                        padding: "12px 24px",
                        marginTop: 8,
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        background: "#f9fafb",
                        color: "#374151",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Load More ({filteredIcons.length - visibleCount} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const isValidLucideIcon = (iconName: string): boolean => {
  return iconName in LucideIcons;
};

export const renderLucideIcon = (
  iconName: string | null,
  size: number = 20,
  color?: string
): React.ReactNode => {
  if (!iconName) return null;
  const IconComponent = (LucideIcons as any)[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} />;
};

export default LucideIconPicker;
