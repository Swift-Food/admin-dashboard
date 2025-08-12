import React, { useEffect, useState, useCallback } from "react";
import orderService from "../services/order.service";
import { driverId as DEFAULT_DRIVER, driverId } from "../constants";
import OrderColumn from "../components/OrderColumn";
import DriverPicker from "../components/DriverPicker";
import {type Driver, getDriverDetails} from "../services/driver.service";
import type {DriverOrder} from "../types/order.types";
import type { NewAssignmentPayload } from "../types/assignments.types";
 import useSocket from "../hooks/useSocket";

const HomeScreen = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>(DEFAULT_DRIVER);
    const [orders, setOrders] = useState<DriverOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();

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

    // 1) Listen for new order assignments from DriverGateway. 
    // Sockets will reconnect when driverId changes. 
    const { data: newAssignment, connected, sendEvent } = useSocket<NewAssignmentPayload>(
    "new-assignment", 
    { 
      namespace: "/driver",
      query: { driverId: selectedDriverId } 
    }
  );

   useEffect(() => {
    if (newAssignment && connected) {
      console.log("🚨 New order assignment received:", newAssignment);
      
      // Convert to your DriverOrder format and add to state
      const newOrder: DriverOrder = {
        id: newAssignment.data.orderId,
        status: 'driver_assigned', // Maps to OrderStatus.DRIVER_ASSIGNED
        market: {
          market_name: newAssignment.data.marketName,
          address: newAssignment.data.marketAddress,
        },
        orderItems: newAssignment.data.items.map(item => ({
          restaurantName: item.restaurantName,
          restaurantId: item.restaurantId,
          itemName: item.itemName,
          quantity: item.quantity,
          price: item.price,
        })),
        placedAt: newAssignment.data.assignmentTime,
        cacheKey: newAssignment.data.cacheKey,
        otp: newAssignment.data.otp,
        estimatedCompensation: parseFloat(newAssignment.data.estimatedCompensation),
        acceptanceDeadline: newAssignment.data.acceptanceDeadline,
        eventResponseType: newAssignment.data.eventResponseType,
      };
      
      // Add to your orders list
      setOrders(prev => [newOrder, ...prev]);
      
      // Optional: Show notification or modal
      console.log("📥 New order added:", newOrder);
    }
  }, [newAssignment, connected]);

    // const getOrders = () => {
    //   const response = orderService.getOrdersByDriver(driverId).then(setOrders);
    //   console.log("Orders", response);
    // };

    //mapping to each column 
    const buckets: Record<string, DriverOrder[]> = {
      FINDING_DRIVER: [],
      PREPARING: [],
      DRIVER_ASSIGNED: [],
      OUT_FOR_DELIVERY: [],
    };

    //driver can only have 3 active orders at a time 

    //First column Finding Driver 
    // multiple listeners for new-assignment for each driver (driver id)
    //Take in order cards that we listen from new-assignment 
    //any 5 driver ids 

    //new column: driver assigned 
    // for each driver id (add a pickup button, works similarly to ready for pickup)

    //second column Ready for Pickup 
    //displays orders with the order status ready for pickup 

    //third column out for delivery 
    // displays order cards that are out for delivery 


    orders.forEach(o => { 
      switch (o.status) {
        case "preparing": 
          buckets.PREPARING.push(o); 
          break;
        
          //finding for driver   
        case "ready_for_pickup": 
          buckets.READY_FOR_PICKUP.push(o); 
          break;

        case "driver_assigned": 
          buckets.DRIVER_ASSIGNED.push(o); 
          break; 

        case "out_for_delivery":   
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

      <DriverPicker
        drivers={drivers}
        value={selectedDriverId}
        onChange={(id) => setSelectedDriverId(id)}
      />
      
      <div className="flex gap-4">
        <OrderColumn title="Finding Driver" orders={buckets.PREPARING} sendEvent={sendEvent} driverId={driverId}/>
        <OrderColumn title="Ready for Pickup" orders={buckets.READY_FOR_PICKUP} sendEvent={sendEvent} driverId={driverId}/>
        <OrderColumn title="Driver Assigned" orders={buckets.FINDING_DRIVER} sendEvent={sendEvent} driverId={driverId}/>
        <OrderColumn title="Out for Delivery" orders={buckets.OUT_FOR_DELIVERY} sendEvent={sendEvent} driverId={driverId}/>
      </div>
    </div>
  );
};

export default HomeScreen;