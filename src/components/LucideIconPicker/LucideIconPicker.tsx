import React, { useState, useRef, useEffect, useMemo } from "react";
import * as LucideIcons from "lucide-react";

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
    // Filter out non-icon exports
    if (excluded.has(key)) return false;
    // Icons start with uppercase letter
    if (key[0] !== key[0].toUpperCase()) return false;
    // Check if it's a valid React component
    const value = (LucideIcons as any)[key];
    return value && (typeof value === "function" || typeof value === "object");
  });
};

interface LucideIconPickerProps {
  value: string | null;
  onChange: (iconName: string | null) => void;
  placeholder?: string;
}

const LucideIconPicker: React.FC<LucideIconPickerProps> = ({
  value,
  onChange,
  placeholder = "Select an icon...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const allIcons = useMemo(() => getAllIconNames(), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search) return allIcons.slice(0, 200); // Show first 200 by default
    return allIcons.filter((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    );
  }, [allIcons, search]);

  const renderIcon = (iconName: string, size: number = 20) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={size} />;
  };

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
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
          <LucideIcons.ChevronDown
            size={16}
            style={{
              color: "#64748b",
              transform: isOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            marginTop: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #e2e8f0" }}>
            <input
              type="text"
              placeholder={`Search ${allIcons.length} icons...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                outline: "none",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              padding: 8,
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 4,
            }}
          >
            {filteredIcons.map((iconName) => (
              <button
                key={iconName}
                onClick={() => handleSelect(iconName)}
                title={iconName}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: value === iconName ? "#e0e7ff" : "transparent",
                  color: value === iconName ? "#3730a3" : "#475569",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (value !== iconName) {
                    e.currentTarget.style.background = "#f1f5f9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== iconName) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {renderIcon(iconName, 24)}
                <span
                  style={{
                    fontSize: 9,
                    marginTop: 2,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {iconName}
                </span>
              </button>
            ))}
            {filteredIcons.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: 16,
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                No icons found
              </div>
            )}
            {!search && filteredIcons.length < allIcons.length && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: 8,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 12,
                }}
              >
                Type to search all {allIcons.length} icons
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
