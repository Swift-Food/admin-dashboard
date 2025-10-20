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
import WithdrawalAdminDashboard from "./pages/PayoutScreen";
import { PaymentStatus } from "./types/order.types";

function App() {
  const [currentPage, setCurrentPage] = useState<SidebarPage>("home");
  const [prevOrderIds, setPrevOrderIds] = useState<string[]>([]);

  useEffect(() => {
    const newOrderSound = new Audio("/sounds/new-order.mp3");
    const paidOrderSound = new Audio("/sounds/brainrot.mp3");

    const pollOrders = async () => {
      try {
        const orders = await orderService.getOrders();
        const currentOrderIds = orders.map((o: any) => o.id);

        // Find newly appeared orders
        const newOrders = orders.filter(
          (o: any) => !prevOrderIds.includes(o.id)
        );

        // Avoid initial-load sound (require we have seen at least one previous poll)
        if (prevOrderIds.length > 0 && newOrders.length > 0) {
          const anyPaid = newOrders.some(
            (o: any) =>
              // support both shapes: order.payment.status or order.paymentStatus
              (o.payment &&
                (o.payment.status === PaymentStatus.PAID ||
                  o.payment.status === PaymentStatus.PENDING)) ||
              o.paymentStatus === PaymentStatus.PAID ||
              o.paymentStatus === PaymentStatus.PENDING
          );

          const soundToPlay = anyPaid ? paidOrderSound : newOrderSound;
          soundToPlay.currentTime = 0;
          // play might reject on browsers that block autoplay — ignore errors
          soundToPlay.play().catch(() => {});
        }

        setPrevOrderIds(currentOrderIds);
      } catch (e) {
        // Optionally handle error
      }
    };

    const intervalId = setInterval(pollOrders, 10000);
    // run once immediately
    pollOrders();
    return () => clearInterval(intervalId);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      // case 'home':
      //   return <HomeScreen />;
      case "orders":
        return <AllOrdersScreen />;
      case "catering":
        return <CateringOrdersScreen />;
      case "payout":
        return <WithdrawalAdminDashboard />;
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
