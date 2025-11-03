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
import orderService from "./services/order.service";
import CateringOrdersScreen from "./pages/CateringScreen";
import WithdrawalAdminDashboard from "./pages/PayoutScreen";
import { PaymentStatus } from "./types/order.types";
import CorporateOrdersScreen from "./pages/CorporateOrderScreen";

function App() {
  const [currentPage, setCurrentPage] = useState<SidebarPage>("home");
  const prevOrderIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const newOrderSound = new Audio("/sounds/new-order.mp3");
    const paidOrderSound = new Audio("/sounds/brainrot.mp3");

    const pollOrders = async () => {
      try {
        const orders = await orderService.getOrders();
        const currentOrderIds = orders.map((o: any) => o.id);

        // Find newly appeared orders
        const newOrders = orders.filter(
          (o: any) => !prevOrderIdsRef.current.includes(o.id)
        );

        console.log(
          "Polling - prevOrderIds:",
          prevOrderIdsRef.current.length,
          "newOrders:",
          newOrders.length
        );

        // Avoid initial-load sound (require we have seen at least one previous poll)
        if (prevOrderIdsRef.current.length > 0 && newOrders.length > 0) {
          const anyPaid = newOrders.some(
            (o: any) =>
              (o.payment && o.payment.status === PaymentStatus.PAID) ||
              o.paymentStatus === PaymentStatus.PAID
          );

          console.log("anyPaid:", anyPaid);
          const soundToPlay = anyPaid ? paidOrderSound : newOrderSound;
          console.log(
            "Playing sound:",
            anyPaid ? "brainrot.mp3" : "new-order.mp3"
          );
          soundToPlay.currentTime = 0;
          soundToPlay
            .play()
            .catch((err) => console.error("Audio play error:", err));
        }

        prevOrderIdsRef.current = currentOrderIds;
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    const intervalId = setInterval(pollOrders, 10000);
    // run once immediately
    pollOrders();
    return () => clearInterval(intervalId);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case "orders":
        return <AllOrdersScreen />;
      case "promotions":
        return <PromotionsScreen />;
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
      case "corporate":
        return <CorporateOrdersScreen/>
      
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
