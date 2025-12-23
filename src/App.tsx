import { useEffect, useRef, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import Sidebar from "./components/Sidebar";
import type { SidebarPage } from "./components/Sidebar";
import PromotionsScreen from "./pages/PromotionsScreen";
import DriverStatusScreen from "./pages/DriverStatusScreen";
import MapScreen from "./pages/MapScreen";
import StatisticsScreen from "./pages/StatisticsScreen";
import AllOrdersScreen from "./pages/OrdersScreen";
import RestaurantAdminDashboard from "./pages/RestaurantScreen/RestaurantScreen";
import CategoriesScreen from "./pages/CategoriesScreen/CategoriesScreen";
import BundlesScreen from "./pages/BundlesScreen/BundlesScreen";
import orderService from "./services/order.service";
import CateringOrdersScreen from "./pages/CateringOrdersTableView";
import WithdrawalAdminDashboard from "./pages/PayoutScreen";
import { PaymentStatus } from "./types/order.types";
import CorporateOrdersScreen from "./pages/CorporateOrdersTableView";
import StripeAccountsScreen from "./pages/StripeAccountsScreen";
import authService from "./services/auth.service";
import LoginScreen from "./pages/LoginScreen";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(authService.isAuthenticated());
  const [currentPage, setCurrentPage] = useState<SidebarPage>("home");
  const prevOrderIdsRef = useRef<string[]>([]);



  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "orders":
        return <AllOrdersScreen />;
      case "promotions":
        return <PromotionsScreen />;
      case "catering":
        return <CateringOrdersScreen />;
      case "bundles":
        return <BundlesScreen />;
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
        return <CorporateOrdersScreen/>
      case "stripe-accounts":
        return <StripeAccountsScreen />

      default:
        return <RestaurantAdminDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1">{renderPage()}</main>
    </div>
  );
}

export default App;
