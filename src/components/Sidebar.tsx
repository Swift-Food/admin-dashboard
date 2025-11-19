import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faMotorcycle,
  faChartBar,
  faMap,
  faChevronLeft,
  faChevronRight,
  faUtensils,
  faBuilding,
  faTags,
  faReceipt,
  faMoneyBillWave,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import authService from "../services/auth.service";

export type SidebarPage =
  | "home"
  | "orders"
  | "promotions"
  | "restaurant"
  | "driver-status"
  | "statistics"
  | "map"
  | "catering"
  | "payout"
  | "corporate";

interface SidebarProps {
  currentPage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
}

const handleLogout = () => {
  authService.logout();
  window.location.reload(); // Reload to trigger login screen
};

const iconCommonStyle = {
  color: "#040273",
  fontSize: 24,
  verticalAlign: "middle",
  display: "block",
  margin: "0 auto",
};
const navItems = [
  {
    id: "home",
    label: "Dashboard",
    icon: <FontAwesomeIcon icon={faHome} style={iconCommonStyle} />,
  },
  {
    id: "orders",
    label: "Orders",
    icon: <FontAwesomeIcon icon={faReceipt} style={iconCommonStyle} />,
  },
  {
    id: "restaurant",
    label: "Restaurants",
    icon: <FontAwesomeIcon icon={faUtensils} style={iconCommonStyle} />,
  },
  {
    id: "catering",
    label: "Catering Orders",
    icon: <FontAwesomeIcon icon={faUsers} style={iconCommonStyle} />,
  },
  {
    id: "corporate",
    label: "Corporate Orders",
    icon: <FontAwesomeIcon icon={faBuilding} style={iconCommonStyle} />,
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: <FontAwesomeIcon icon={faTags} style={iconCommonStyle} />,
  },
  {
    id: "driver-status",
    label: "Drivers",
    icon: <FontAwesomeIcon icon={faMotorcycle} style={iconCommonStyle} />,
  },
  {
    id: "payout",
    label: "Payouts",
    icon: <FontAwesomeIcon icon={faMoneyBillWave} style={iconCommonStyle} />,
  },
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
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      style={{
        ...sidebarStyle,
        width: expanded ? 250 : 70,
        transition: "width 0.2s",
      }}
    >
      <div style={headerStyle}>
        <span
          style={{
            ...brandStyle,
            opacity: expanded ? 1 : 0,
            width: expanded ? "auto" : 0,
            overflow: "hidden",
            transition: "opacity 0.2s, width 0.2s",
          }}
        >
          Swift Admin
        </span>
        <button
          style={toggleBtnStyle}
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <FontAwesomeIcon
            icon={expanded ? faChevronLeft : faChevronRight}
            style={{
              color: "#040273",
              fontSize: 20,
              verticalAlign: "middle",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </button>
      </div>
      <nav style={navStyle}>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as SidebarPage)}
              style={{
                ...navBtnStyle,
                background: isActive ? "#dbeafe" : "transparent",
                color: isActive ? "#1d4ed8" : "#051661",
                fontWeight: isActive ? 700 : 500,
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                boxSizing: "border-box",
                justifyContent: expanded ? "flex-start" : "center",
              }}
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
                }}
              >
                {item.label}
              </span>
            </button>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: "block", margin: "0 auto" }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px",
  borderBottom: "1px solid #f3f4f6",
};

const brandStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "1.125rem",
  color: "#1d4ed8",
  transition: "opacity 0.2s, width 0.2s",
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

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: "16px 0",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const navBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  borderRadius: 8,
  margin: "0 8px",
  fontSize: "1rem",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  transition: "background 0.2s, color 0.2s",
};

const labelStyle: React.CSSProperties = {
  transition: "opacity 0.2s, width 0.2s",
};

export default Sidebar;
