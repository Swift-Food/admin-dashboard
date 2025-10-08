import { useEffect, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import Sidebar from "./components/Sidebar";
import type { SidebarPage } from "./components/Sidebar";

import DriverStatusScreen from "./pages/DriverStatusScreen";
import MapScreen from "./pages/MapScreen";
import StatisticsScreen from "./pages/StatisticsScreen";
import AllOrdersScreen from "./pages/OrdersScreen";
import RestaurantAdminDashboard from "./pages/RestaurantScreen/RestaurantScreen";
import orderService from "./services/order.service";
import CateringOrdersScreen from "./pages/CateringScreen";
import DriverPayoutsScreen from "./pages/PayoutScreen";

function App() {
  const [currentPage, setCurrentPage] = useState<SidebarPage>("home");
  const [prevOrderIds, setPrevOrderIds] = useState<string[]>([]);

  useEffect(() => {
    const orderSound = new Audio("/sounds/new-order.mp3");

    const pollOrders = async () => {
      try {
        const orders = await orderService.getOrders();
        const currentOrderIds = orders.map((o : any) => o.id);
        const newOrderIds = currentOrderIds.filter(
          (id : any) => !prevOrderIds.includes(id)
        );
        if (newOrderIds.length > 0) {
          orderSound.currentTime = 0;
          orderSound.play();
        }
        setPrevOrderIds(currentOrderIds);
      } catch (e) {
        // Optionally handle error
      }
    };

    const intervalId = setInterval(pollOrders, 10000);
    return () => clearInterval(intervalId);
  }, [prevOrderIds]);

  const renderPage = () => {
    switch (currentPage) {
      // case 'home':
      //   return <HomeScreen />;
      case "orders":
        return <AllOrdersScreen />;
      case "catering":
        return <CateringOrdersScreen />;
      case "driver-payout":
        return <DriverPayoutsScreen />;
      case "restaurant":
        return <RestaurantAdminDashboard />;
      case "driver-status":
        return <DriverStatusScreen />;
      case "statistics":
        return <StatisticsScreen />;
      case "map":
        return <MapScreen />;
      default:
        return <RestaurantAdminDashboard />;
      // default:
      //   return <HomeScreen />;
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
