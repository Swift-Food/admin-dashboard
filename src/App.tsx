import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import "leaflet/dist/leaflet.css";
import Sidebar from "./components/Sidebar";
import type { SidebarPage, AdminMode } from "./components/Sidebar";
import PromotionsScreen from "./pages/PromotionsScreen";
import DriverStatusScreen from "./pages/DriverStatusScreen";
import MapScreen from "./pages/MapScreen";
import StatisticsScreen from "./pages/StatisticsScreen";
import AllOrdersScreen from "./pages/OrdersScreen";
import RestaurantAdminDashboard from "./pages/RestaurantScreen/RestaurantScreen";
import CategoriesScreen from "./pages/CategoriesScreen/CategoriesScreen";
import BundlesScreen from "./pages/BundlesScreen/BundlesScreen";
import CateringOrdersScreen from "./pages/CateringOrdersTableView";
import WithdrawalAdminDashboard from "./pages/PayoutScreen";
import CorporateOrdersScreen from "./pages/CorporateOrdersTableView";
import StripeAccountsScreen from "./pages/StripeAccountsScreen";
import MiscellaneousScreen from "./pages/MiscellaneousScreen";
import EventCategoriesScreen from "./pages/EventCategoriesScreen/EventCategoriesScreen";
import EventsScreen from "./pages/EventsScreen/EventsScreen";
import EventLocationsScreen from "./pages/EventLocationsScreen/EventLocationsScreen";
import CalendarsScreen from "./pages/CalendarsScreen/CalendarsScreen";
import CateringSessionsScreen from "./pages/CateringSessionsScreen";
import authService from "./services/auth.service";
import LoginScreen from "./pages/LoginScreen";

// Map URL paths to SidebarPage IDs
export const pathToPageMap: Record<string, SidebarPage> = {
  home: "home",
  orders: "orders",
  "catering-orders": "catering",
  "catering-sessions": "catering-sessions",
  "corporate-orders": "corporate",
  restaurants: "restaurant",
  categories: "categories",
  promotions: "promotions",
  payouts: "payout",
  "stripe-accounts": "stripe-accounts",
  drivers: "driver-status",
  statistics: "statistics",
  map: "map",
  miscellaneous: "miscellaneous",
  "event-categories": "event-categories",
  events: "events",
  "event-locations": "event-locations",
  calendars: "calendars",
  bundles: "bundles",
  "catering-bundles": "catering-bundles",
};

// Map SidebarPage IDs to URL paths
export const pageToPathMap: Record<SidebarPage, string> = {
  home: "home",
  orders: "orders",
  catering: "catering-orders",
  "catering-sessions": "catering-sessions",
  corporate: "corporate-orders",
  restaurant: "restaurants",
  categories: "categories",
  promotions: "promotions",
  payout: "payouts",
  "stripe-accounts": "stripe-accounts",
  "driver-status": "drivers",
  statistics: "statistics",
  map: "map",
  miscellaneous: "miscellaneous",
  "event-categories": "event-categories",
  events: "events",
  "event-locations": "event-locations",
  calendars: "calendars",
  bundles: "bundles",
  "catering-bundles": "catering-bundles",
};

// Define which pages belong to which mode
const swiftPages: SidebarPage[] = [
  "home",
  "orders",
  "catering",
  "catering-sessions",
  "corporate",
  "restaurant",
  "categories",
  "promotions",
  "payout",
  "stripe-accounts",
  "driver-status",
  "statistics",
  "map",
  "miscellaneous",
  "catering-bundles",
];

const prismoPages: SidebarPage[] = [
  "home",
  "event-categories",
  "events",
  "event-locations",
  "calendars",
  "bundles",
];

function PageRenderer() {
  const { mode, page } = useParams<{ mode: string; page: string }>();
  const navigate = useNavigate();

  // Validate that mode is valid
  if (mode !== "swift" && mode !== "prismo") {
    const savedMode = localStorage.getItem("adminMode") || "swift";
    return <Navigate to={`/${savedMode}/home`} replace />;
  }

  const adminMode = mode as AdminMode;
  const currentPage = pathToPageMap[page || "home"] || "home";

  // Validate that the page belongs to the current mode
  const validPagesForMode = adminMode === "swift" ? swiftPages : prismoPages;
  if (!validPagesForMode.includes(currentPage)) {
    // Redirect to home of current mode if invalid page
    return <Navigate to={`/${adminMode}/home`} replace />;
  }

  const handleNavigate = (pageId: SidebarPage) => {
    const path = pageToPathMap[pageId];
    navigate(`/${adminMode}/${path}`);
  };

  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case "orders":
        return <AllOrdersScreen />;
      case "promotions":
        return <PromotionsScreen />;
      case "catering":
        return <CateringOrdersScreen />;
      case "catering-sessions":
        return <CateringSessionsScreen />;
      case "bundles":
        return <BundlesScreen bundleType="prismo" />;
      case "catering-bundles":
        return <BundlesScreen bundleType="catering" />;
      case "payout":
        return <WithdrawalAdminDashboard />;
      case "restaurant":
        return <RestaurantAdminDashboard />;
      case "categories":
        return <CategoriesScreen />;
      case "driver-status":
        return <DriverStatusScreen />;
      case "statistics":
        return <StatisticsScreen />;
      case "map":
        return <MapScreen />;
      case "corporate":
        return <CorporateOrdersScreen />;
      case "stripe-accounts":
        return <StripeAccountsScreen />;
      case "miscellaneous":
        return <MiscellaneousScreen />;
      case "event-categories":
        return <EventCategoriesScreen />;
      case "events":
        return <EventsScreen />;
      case "event-locations":
        return <EventLocationsScreen />;
      case "calendars":
        return <CalendarsScreen />;
      default:
        return <RestaurantAdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        adminMode={adminMode}
      />
      <main
        className="flex-1 overflow-x-auto min-w-0"
        style={{ marginLeft: sidebarExpanded ? 250 : 70 }}
      >
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(authService.isAuthenticated());

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  // Get the saved admin mode from localStorage for the default redirect
  const savedMode = localStorage.getItem("adminMode") || "swift";

  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect to saved mode's home */}
        <Route path="/" element={<Navigate to={`/${savedMode}/home`} replace />} />

        {/* Swift routes */}
        <Route path="/swift" element={<Navigate to="/swift/home" replace />} />

        {/* Prismo routes */}
        <Route path="/prismo" element={<Navigate to="/prismo/home" replace />} />

        {/* Main route pattern: /:mode/:page */}
        <Route path="/:mode/:page" element={<PageRenderer />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={`/${savedMode}/home`} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
