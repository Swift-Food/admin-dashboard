import React, { useEffect, useState, useCallback } from "react";
import orderService from "../services/order.service";
import { driverId } from "../constants";
import OrderColumn from "../components/OrderColumn";
import type {DriverOrder} from "../types/order.types";
 import useSocket from "../hooks/useSocket";

const HomeScreen = () => {
    const [orders, setOrders] = useState<DriverOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();

    //rest fetch function
    const fetchOrders = useCallback(() => {
      orderService.getOrdersByDriver(driverId)
      .then(setOrders)
      .catch(err => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
    }, []);

    //initial load 
    useEffect(() => {
      fetchOrders();
    }, [fetchOrders]);

    //poll every 20 seconds 
    useEffect(() => {
      const id = setInterval(fetchOrders, 20_000);
      return () => clearInterval(id);
  }, [fetchOrders]);

// 1) Listen for new order assignments from DriverGateway
    const { data: newAssignment, connected, sendEvent } = useSocket<{
      type: 'NEW_ORDER_ASSIGNMENT';
      data: {
        orderId: string;
        marketName: string;
        marketAddress: any;
        estimatedCompensation: string;
        pickupLocation: string;
        deliveryLocation: any;
        items: any[];
        otp: string;
        assignmentTime: string;
        acceptanceDeadline: string;
        eventResponseType: 'order-accept';
        cacheKey: string;
      };
    }>("new-assignment", { 
      namespace: "/driver", // Use driver namespace
      query: { driverId } 
    });

    // 4) Listen for restaurant order ready notifications
    const { data: orderReady } = useSocket<{
      type: 'RESTAURANT_ORDER_READY';
      data: {
        orderId: string;
        restaurantId: string;
        readyTime: string;
      };
    }>("restaurant-order-ready", { 
      namespace: "/driver",
      query: { driverId } 
    });

   useEffect(() => {
    if (newAssignment && connected) {
      console.log("🚨 New order assignment received:", newAssignment);
      
      // Convert to your DriverOrder format and add to state
      const newOrder: DriverOrder = {
        id: newAssignment.data.orderId,
        status: 'driver_assigned', // or 'incoming'
        market: {
          market_name: newAssignment.data.marketName,
          address: newAssignment.data.marketAddress,
        },
        orderItems: newAssignment.data.items.map(item => ({
          restaurantName: item.restaurantName || "",
          restaurantId: item.restaurantId || "",
        })),
        placedAt: newAssignment.data.assignmentTime,
        cacheKey: newAssignment.data.cacheKey,
        otp: newAssignment.data.otp,
        // Map other fields as needed
      };
      
      // Add to your orders list
      setOrders(prev => [newOrder, ...prev]);
      
      // Optional: Show notification or modal
      console.log("📥 New order added:", newOrder);
    }
  }, [newAssignment, connected]);

    const getOrders = () => {
      const response = orderService.getOrdersByDriver(driverId).then(setOrders);
      console.log("Orders", response);
    };

    //mapping to each column 
    const buckets: Record<string, DriverOrder[]> = {
      FINDING_DRIVER: [],
      PREPARING: [],
      OUT_FOR_DELIVERY: [],
    };

    orders.forEach(o => { 
      switch (o.status) {
        case "placed": 
        case "confirmed": 
        case "preparing": 
          buckets.PREPARING.push(o); 
          break;

        case "ready_for_pickup": 
        case "driver_assigned": 
          buckets.FINDING_DRIVER.push(o); 
          break;

        case "out_for_delivery":   
        case "delivered":
          buckets.OUT_FOR_DELIVERY.push(o); 
          break;
      }
});

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;


   return (
    <div className="p-4 h-screen bg-[#ccdaf5]">
      {!connected && (
        <div className="text-yellow-600">Reconnecting to live updates...</div>)}

        {newAssignment && (
          <div className="mb-4 p-2 bg-green-200 rounded">
          🚨 New order: <strong>{newAssignment.data.orderId}</strong> at{" "}
          <strong>{newAssignment.data.marketName}</strong>
          </div>
        )}

      <h1 className="text-xl font-bold mb-4">Orders</h1>
      <div className="flex gap-4">
        <OrderColumn title="Preparing" orders={buckets.PREPARING} sendEvent={sendEvent} driverId={driverId}/>
        <OrderColumn title="Finding Driver" orders={buckets.FINDING_DRIVER} sendEvent={sendEvent} driverId={driverId}/>
        <OrderColumn title="Out for Delivery" orders={buckets.OUT_FOR_DELIVERY} sendEvent={sendEvent} driverId={driverId}/>
      </div>
    </div>
  );
};

export default HomeScreen;