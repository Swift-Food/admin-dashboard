import React, { useEffect, useState, useCallback } from "react";
import orderService from "../services/order.service";
import { driverId as DEFAULT_DRIVER, driverId } from "../constants";
import OrderColumn from "../components/OrderColumn";
import DriverPicker from "../components/DriverPicker";
import {type Driver, getDriverDetails} from "../services/driver.service";
import type {DriverOrder} from "../types/order.types";
import type { NewAssignmentPayload } from "../types/assignments.types";
 import useSocket from "../hooks/useSocket";
 import { useDriverAssignments } from "../hooks/useDriverAssignments";

const HomeScreen = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>(DEFAULT_DRIVER);
    const [orders, setOrders] = useState<DriverOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();

    const driverIds = ["caf6bae1-bae5-4879-a62e-4928227a17e8", 
                        "9341e533-f1d1-451f-9531-2df70fa55877", 
                        "68421751-8274-4221-9809-563d4f42db7f",
                        "737185bd-b011-44f4-9dc3-ac4921f4991e",
                        "010c7232-8c77-4b8b-896d-6fe3e45c2264",
                        "8ecec884-8586-448b-8bfe-dd3d4a3733cc"]

    const { assignments, connectionStatus, listeners } = useDriverAssignments(driverIds);

    // Load driver details on mount 
    useEffect(() => {
      (async () => {
        try {
          const list = await getDriverDetails();
          setDrivers(list);

          if (!list.find(d => d.id === selectedDriverId) && list[0]) {
            setSelectedDriverId(list[0].id);
          }
        } catch(e: any) {
          console.error(e)
        }
      })();
    }, []);

    //rest fetch function for selected drivers 
    const fetchOrders = useCallback(async() => {
      if (!selectedDriverId) return;
      try {
        const data = await orderService.getOrdersByDriver(selectedDriverId);
        setOrders(data);
        setError(undefined);
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      }
      finally {
        setLoading(false);
      }
    }, [selectedDriverId]);

    //initial load 
    useEffect(() => {
      setLoading(true);
      fetchOrders();
    }, [fetchOrders]);

    //poll every 20 seconds 
    useEffect(() => {
      const id = setInterval(fetchOrders, 20_000);
      return () => clearInterval(id);
  }, [fetchOrders]);

      // Convert assignments to DriverOrder format for Finding Driver column
    const assignmentOrders: DriverOrder[] = Object.entries(assignments).map(([driverId, assignment]) => ({
      id: assignment.data.orderId,
      status: 'new-assignment' as const,
      market: {
        market_name: assignment.data.marketName,
        address: assignment.data.marketAddress,
      },
      // ✅ Fix: Items have a different structure
      orderItems: assignment.data.items.flatMap((item: any) => 
        item.menuItems.map((menuItem: any) => ({
          restaurantName: item.restaurantName || "",
          restaurantId: item.restaurantId || "",
          itemName: menuItem.name || "", // ✅ Fix: Use menuItem.name
          quantity: menuItem.quantity || 1, // ✅ Fix: Use menuItem.quantity
          price: menuItem.unitPrice || 0, // ✅ Fix: Use menuItem.unitPrice
          totalPrice: menuItem.totalPrice || 0, // ✅ Additional field
          menuItemId: menuItem.menuItemId || "", // ✅ Additional field
        }))
      ),
      placedAt: assignment.data.assignmentTime,
      cacheKey: assignment.data.cacheKey,
      otp: assignment.data.otp || "", // ✅ Fix: otp doesn't exist in payload, provide fallback
      estimatedCompensation: parseFloat(assignment.data.estimatedCompensation || "0"),
      acceptanceDeadline: assignment.data.acceptanceDeadline,
      eventResponseType: assignment.data.eventResponseType,
      assignedDriverId: driverId,
      // ✅ Additional fields from the JSON
      phoneNumber: assignment.data.number || "",
      retryAttempt: assignment.data.retryAttempt || 0,
      isRetry: assignment.data.isRetry || false,
      urgencyLevel: assignment.data.urgencyLevel || "NORMAL",
    }));

    //mapping to each column 
    const buckets: Record<string, DriverOrder[]> = {
      //Receives orders for new-assignment events. 
      FINDING_DRIVER: assignmentOrders,

      READY_FOR_PICKUP: [],
      DRIVER_ASSIGNED: [],
      OUT_FOR_DELIVERY: [],
    };

    orders.forEach(o => { 
      switch (o.status) {        
        //Orders with status "Ready for Pickup". 
        case "ready_for_pickup": 
          buckets.READY_FOR_PICKUP.push(o); 
          break;

        //Shows orders with an assigned driver.   
        case "driver_assigned": 
          buckets.DRIVER_ASSIGNED.push(o); 
          break; 

        //Shows orders that are out for delivery.   
        case "out_for_delivery":   
          buckets.OUT_FOR_DELIVERY.push(o); 
          break;
      }
});

    const sendEvent = Object.values(listeners)[0]?.sendEvent || (() => {});

    if (loading) return <div>Loading orders...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;


   return (
    <div className="p-4 h-screen bg-[#ccdaf5]">
      {/* {!connected && (
        <div className="text-yellow-600">Reconnecting to live updates...</div>)}

        {newAssignment && (
          <div className="mb-4 p-2 bg-green-200 rounded">
          🚨 New order: <strong>{newAssignment.data.orderId}</strong> at{" "}
          <strong>{newAssignment.data.marketName}</strong>
          </div>
        )} */}

      <h1 className="text-xl font-bold mb-4">Order Dashboard</h1>

      <DriverPicker
        drivers={drivers}
        value={selectedDriverId}
        onChange={(id) => setSelectedDriverId(id)}
      />

        {/* Connection Status Display */}
      {/* <div className="mb-4 p-2 bg-gray-100 rounded">
        <h3 className="font-semibold black-text">Driver Connections:</h3>
        <div className="grid grid-cols-5 gap-2">
          {driverIds.map(driverId => (
            <div key={driverId} className="text-sm">
              Driver {driverId.slice(0, 8)}...: {connectionStatus[driverId] ? '🟢' : '🔴'}
              {assignments[driverId] && (
                <div className="text-xs text-green-600">
                  📦 {assignments[driverId].data.orderId.slice(0, 8)}...
                </div>
              )}
            </div>
          ))}
        </div>
      </div> */}
      
      <div className="flex gap-4">
        <OrderColumn title="Finding Driver" orders={buckets.FINDING_DRIVER} sendEvent={sendEvent} driverId={selectedDriverId}/>
        <OrderColumn title="Ready for Pickup" orders={buckets.READY_FOR_PICKUP} sendEvent={sendEvent} driverId={selectedDriverId}/>
        <OrderColumn title="Driver Assigned" orders={buckets.DRIVER_ASSIGNED} sendEvent={sendEvent} driverId={selectedDriverId}/>
        <OrderColumn title="Out for Delivery" orders={buckets.OUT_FOR_DELIVERY} sendEvent={sendEvent} driverId={selectedDriverId}/>
      </div>
    </div>
  );
};

export default HomeScreen;