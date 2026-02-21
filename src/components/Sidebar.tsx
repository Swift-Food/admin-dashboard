import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faMotorcycle,
  faChartBar,
  faMap,
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faUtensils,
  faBuilding,
  faTags,
  faReceipt,
  faMoneyBillWave,
  faUsers,
  faLayerGroup,
  faBox,
  faCreditCard,
  faWrench,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import authService from "../services/auth.service";
import cateringService from "../services/catering.service";

export type AdminMode = "swift" | "prismo";

export type SidebarPage =
  | "home"
  | "orders"
  | "promotions"
  | "restaurant"
  | "categories"
  | "event-categories"
  | "events"
  | "calendars"
  | "event-locations"
  | "driver-status"
  | "statistics"
  | "map"
  | "catering"
  | "catering-sessions"
  | "bundles"
  | "payout"
  | "corporate"
  | "stripe-accounts"
  | "miscellaneous";

interface NavItem {
  id: SidebarPage;
  label: string;
  icon: React.ReactNode;
  mode?: AdminMode; // If specified, only show in this mode
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
  mode?: AdminMode; // If specified, only show in this mode
}

interface SidebarProps {
  currentPage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  adminMode: AdminMode;
}

const handleLogout = () => {
  authService.logout();
  window.location.reload();
};

const iconCommonStyle = {
  color: "#040273",
  fontSize: 20,
  verticalAlign: "middle",
  display: "block",
  margin: "0 auto",
};

const prismoIconStyle = {
  ...iconCommonStyle,
  color: "#7c3aed",
};

const sectionIconStyle = {
  color: "#9ca3af",
  fontSize: 12,
};

const navSections: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      {
        id: "home",
        label: "Dashboard",
        icon: <FontAwesomeIcon icon={faHome} style={iconCommonStyle} />,
      },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    mode: "swift",
    items: [
      {
        id: "orders",
        label: "Orders",
        icon: <FontAwesomeIcon icon={faReceipt} style={iconCommonStyle} />,
      },
      {
        id: "catering",
        label: "Catering Orders",
        icon: <FontAwesomeIcon icon={faUsers} style={iconCommonStyle} />,
      },
      {
        id: "catering-sessions",
        label: "Drivers",
        icon: <FontAwesomeIcon icon={faMotorcycle} style={iconCommonStyle} />,
      },
      {
        id: "corporate",
        label: "Corporate Orders",
        icon: <FontAwesomeIcon icon={faBuilding} style={iconCommonStyle} />,
      },
    ],
  },
  {
    id: "swift-management",
    label: "Management",
    mode: "swift",
    items: [
      {
        id: "restaurant",
        label: "Restaurants",
        icon: <FontAwesomeIcon icon={faUtensils} style={iconCommonStyle} />,
      },
      {
        id: "categories",
        label: "Menu Categories",
        icon: <FontAwesomeIcon icon={faLayerGroup} style={iconCommonStyle} />,
      },
      {
        id: "promotions",
        label: "Promotions",
        icon: <FontAwesomeIcon icon={faTags} style={iconCommonStyle} />,
      },
    ],
  },
  {
    id: "prismo-management",
    label: "Event Management",
    mode: "prismo",
    items: [
      {
        id: "event-categories",
        label: "Event Categories",
        icon: <FontAwesomeIcon icon={faCalendarAlt} style={prismoIconStyle} />,
      },
      {
        id: "events",
        label: "Events",
        icon: <FontAwesomeIcon icon={faCalendarAlt} style={prismoIconStyle} />,
      },
      {
        id: "event-locations",
        label: "Locations",
        icon: <FontAwesomeIcon icon={faMap} style={prismoIconStyle} />,
      },
      {
        id: "calendars",
        label: "Calendars",
        icon: <FontAwesomeIcon icon={faCalendarAlt} style={prismoIconStyle} />,
      },
      {
        id: "bundles",
        label: "Catering Bundles",
        icon: <FontAwesomeIcon icon={faBox} style={prismoIconStyle} />,
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    mode: "swift",
    items: [
      {
        id: "payout",
        label: "Payouts",
        icon: <FontAwesomeIcon icon={faMoneyBillWave} style={iconCommonStyle} />,
      },
      {
        id: "stripe-accounts",
        label: "Stripe Accounts",
        icon: <FontAwesomeIcon icon={faCreditCard} style={iconCommonStyle} />,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    mode: "swift",
    items: [
      {
        id: "driver-status",
        label: "Drivers",
        icon: <FontAwesomeIcon icon={faMotorcycle} style={iconCommonStyle} />,
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    mode: "swift",
    items: [
      {
        id: "statistics",
        label: "Statistics",
        icon: <FontAwesomeIcon icon={faChartBar} style={iconCommonStyle} />,
      },
      {
        id: "map",
        label: "Map",
        icon: <FontAwesomeIcon icon={faMap} style={iconCommonStyle} />,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    mode: "swift",
    items: [
      {
        id: "miscellaneous",
        label: "Miscellaneous",
        icon: <FontAwesomeIcon icon={faWrench} style={iconCommonStyle} />,
      },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, expanded, onExpandedChange, adminMode }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [pendingCateringCount, setPendingCateringCount] = useState(0);
  const navigate = useNavigate();

  const fetchPendingCount = useCallback(async () => {
    try {
      const orders = await cateringService.getOrders();
      const count = orders.filter((o) => o.status === "pending_review").length;
      setPendingCateringCount(count);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  const handleModeChange = (newMode: AdminMode) => {
    localStorage.setItem("adminMode", newMode);
    navigate(`/${newMode}/home`);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isSectionActive = (section: NavSection): boolean => {
    return section.items.some((item) => item.id === currentPage);
  };

  // Filter sections based on current mode
  const filteredSections = navSections.filter(
    (section) => !section.mode || section.mode === adminMode
  );

  const isSwift = adminMode === "swift";

  return (
    <aside
      style={{
        ...sidebarStyle,
        width: expanded ? 250 : 70,
        transition: "width 0.2s",
        borderRightColor: isSwift ? "#e5e7eb" : "#ddd6fe",
      }}
    >
      {/* Header with brand */}
      <div style={headerStyle}>
        <span
          style={{
            ...brandStyle,
            color: isSwift ? "#1d4ed8" : "#7c3aed",
            opacity: expanded ? 1 : 0,
            width: expanded ? "auto" : 0,
            overflow: "hidden",
            transition: "opacity 0.2s, width 0.2s",
          }}
        >
          {isSwift ? "Swift" : "Prismo"}
        </span>
        <button
          style={toggleBtnStyle}
          onClick={() => onExpandedChange(!expanded)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <FontAwesomeIcon
            icon={expanded ? faChevronLeft : faChevronRight}
            style={{
              color: isSwift ? "#040273" : "#7c3aed",
              fontSize: 20,
              verticalAlign: "middle",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </button>
      </div>

      {/* Mode Toggle */}
      <div style={modeToggleContainerStyle}>
        {expanded ? (
          <div style={modeToggleStyle}>
            <button
              onClick={() => handleModeChange("swift")}
              style={{
                ...modeButtonStyle,
                background: isSwift ? "#dbeafe" : "transparent",
                color: isSwift ? "#1d4ed8" : "#6b7280",
                fontWeight: isSwift ? 600 : 400,
              }}
            >
              Swift
            </button>
            <button
              onClick={() => handleModeChange("prismo")}
              style={{
                ...modeButtonStyle,
                background: !isSwift ? "#ede9fe" : "transparent",
                color: !isSwift ? "#7c3aed" : "#6b7280",
                fontWeight: !isSwift ? 600 : 400,
              }}
            >
              Prismo
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleModeChange(isSwift ? "prismo" : "swift")}
            style={modeIconButtonStyle}
            title={`Switch to ${isSwift ? "Prismo" : "Swift"}`}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: isSwift ? "#dbeafe" : "#ede9fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: isSwift ? "#1d4ed8" : "#7c3aed",
              }}
            >
              {isSwift ? "S" : "P"}
            </span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={navStyle}>
        {filteredSections.map((section) => {
          const isCollapsed = collapsedSections.has(section.id);
          const hasActiveItem = isSectionActive(section);
          const isPrismoSection = section.mode === "prismo";

          return (
            <div key={section.id} style={sectionContainerStyle}>
              {/* Section Header */}
              {expanded && (
                <button
                  onClick={() => toggleSection(section.id)}
                  style={{
                    ...sectionHeaderStyle,
                    color: hasActiveItem
                      ? isPrismoSection
                        ? "#7c3aed"
                        : "#1d4ed8"
                      : "#6b7280",
                  }}
                >
                  <span style={sectionLabelStyle}>{section.label}</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    style={{
                      ...sectionIconStyle,
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
              )}

              {/* Section Items */}
              {(!isCollapsed || !expanded) && (
                <div style={sectionItemsStyle}>
                  {section.items.map((item) => {
                    const isActive = currentPage === item.id;
                    const itemIsPrismo = section.mode === "prismo";
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        style={{
                          ...navBtnStyle,
                          background: isActive
                            ? itemIsPrismo
                              ? "#ede9fe"
                              : "#dbeafe"
                            : "transparent",
                          color: isActive
                            ? itemIsPrismo
                              ? "#7c3aed"
                              : "#1d4ed8"
                            : "#051661",
                          fontWeight: isActive ? 700 : 500,
                          height: 44,
                          minHeight: 44,
                          maxHeight: 44,
                          boxSizing: "border-box",
                          justifyContent: expanded ? "flex-start" : "center",
                          paddingLeft: expanded ? 24 : 16,
                          position: "relative",
                        }}
                        title={expanded ? undefined : item.label}
                      >
                        <span>{item.icon}</span>
                        <span
                          style={{
                            ...labelStyle,
                            opacity: expanded ? 1 : 0,
                            width: expanded ? "auto" : 0,
                            marginLeft: expanded ? 12 : 0,
                            padding: 0,
                            overflow: "hidden",
                            transition: "opacity 0.2s, width 0.2s, margin-left 0.2s",
                            display: expanded ? "inline" : "none",
                            fontSize: "0.9rem",
                          }}
                        >
                          {item.label}
                        </span>
                        {item.id === "catering" && pendingCateringCount > 0 && (
                          <span
                            style={{
                              background: "#dc2626",
                              color: "#fff",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              borderRadius: "9999px",
                              minWidth: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0 6px",
                              marginLeft: expanded ? "auto" : 0,
                              position: expanded ? "relative" : "absolute",
                              top: expanded ? undefined : -4,
                              right: expanded ? undefined : -4,
                              lineHeight: 1,
                            }}
                          >
                            {pendingCateringCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: "16px", borderTop: "1px solid #f3f4f6" }}>
        <button
          onClick={handleLogout}
          style={{
            ...navBtnStyle,
            color: "#dc2626",
            fontWeight: 500,
            justifyContent: expanded ? "flex-start" : "center",
          }}
        >
          <span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ display: "block", margin: "0 auto" }}
            >
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            style={{
              ...labelStyle,
              opacity: expanded ? 1 : 0,
              width: expanded ? "auto" : 0,
              marginLeft: expanded ? 12 : 0,
              overflow: "hidden",
              transition: "opacity 0.2s, width 0.2s, margin-left 0.2s",
              display: expanded ? "inline" : "none",
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

// --- CSS-in-JS styles below ---
const sidebarStyle: React.CSSProperties = {
  height: "100vh",
  background: "#fff",
  borderRight: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  flexShrink: 0,
  position: "fixed",
  top: 0,
  left: 0,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px",
  borderBottom: "1px solid #f3f4f6",
  flexShrink: 0,
};

const brandStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "1.25rem",
  transition: "opacity 0.2s, width 0.2s, color 0.2s",
};

const toggleBtnStyle: React.CSSProperties = {
  marginLeft: 8,
  padding: 4,
  borderRadius: 6,
  background: "none",
  border: "none",
  cursor: "pointer",
  outline: "none",
  color: "#000",
  display: "flex-start",
  alignItems: "center",
};

const modeToggleContainerStyle: React.CSSProperties = {
  padding: "12px 12px 8px",
  borderBottom: "1px solid #f3f4f6",
};

const modeToggleStyle: React.CSSProperties = {
  display: "flex",
  background: "#f3f4f6",
  borderRadius: 8,
  padding: 3,
  gap: 2,
};

const modeButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "6px 12px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontSize: "0.8125rem",
  transition: "all 0.2s",
};

const modeIconButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  padding: 0,
  background: "none",
  border: "none",
  cursor: "pointer",
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 0",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  overflowY: "auto",
};

const sectionContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 16px",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  width: "100%",
};

const sectionLabelStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const sectionItemsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const navBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  borderRadius: 8,
  margin: "0 8px",
  fontSize: "0.9rem",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  transition: "background 0.2s, color 0.2s",
};

const labelStyle: React.CSSProperties = {
  transition: "opacity 0.2s, width 0.2s",
};

export default Sidebar;
