import React, { useEffect, useState, useCallback } from "react";
import orderService from "../services/order.service";
import { driverId as DEFAULT_DRIVER, driverId, longitude, latitude, sampleOrderId } from "../constants";
import OrderColumn from "../components/OrderColumn";
import DriverPicker from "../components/DriverPicker";
import {type Driver, getDriverDetails} from "../services/driver.service";
import type {DriverOrder} from "../types/order.types";
import { useDriverAssignments } from "../hooks/useDriverAssignments";

const HomeScreen = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>(DEFAULT_DRIVER);
    const [orders, setOrders] = useState<DriverOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();

    //Selected 6 Driver Ids 
    const driverIds = [ "caf6bae1-bae5-4879-a62e-4928227a17e8", 
                        "9341e533-f1d1-451f-9531-2df70fa55877", 
                        "68421751-8274-4221-9809-563d4f42db7f",
                        "737185bd-b011-44f4-9dc3-ac4921f4991e",
                        "010c7232-8c77-4b8b-896d-6fe3e45c2264",
                        "8ecec884-8586-448b-8bfe-dd3d4a3733cc",
                        "ccdc5ca3-be6a-4d82-acb8-fe216086ed7d",
                        "dd971698-b0bc-47cc-8d1b-f356b49d5b48",
                    ]

    const { assignments, listeners } = useDriverAssignments(driverIds);

    // Load driver details on mount with the selected Driver Ids
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
    }, [selectedDriverId]);

    const sendLocationUpdates = () => {
      console.log('🔍 Starting location updates for all drivers...');
      
      driverIds.forEach(driverId => {
        const listener = listeners[driverId];
        const currentSendEvent = listener?.sendEvent;

        console.log(`🔍 Driver ${driverId}:`, {
          hasListener: !!listener,
          hasConnection: listener?.connected,
          hasSendEvent: !!currentSendEvent
        });

          if (currentSendEvent && listeners[driverId]?.connected) {
            const locationPayload = {
              longitude: longitude,
              latitude: latitude,
              orderCache: `${driverId}:${sampleOrderId}:location`,
              timestamp: Date.now()
            };

            currentSendEvent("update-location", locationPayload, (response: any) => {
              //console.log(`✅ update-location response for driver ${driverId}:`, response);
            });
          } else {
            console.warn(`No sendEvent function available for driver ${driverId}:`, {
              reason: !listener ? 'No listener' : 
                      !currentSendEvent ? 'No sendEvent function' :
                      !listener.connected ? 'Not connected' : 'Unknown'
            });
          }
        });
    }

    //rest fetch function for selected drivers 
    const fetchOrders = useCallback(async() => {
      if (!selectedDriverId) return;
      try {
        const data = await orderService.getOrdersByDriver(selectedDriverId);
        setOrders(data);
        setError(undefined);

        //calls to send location updates. 
        sendLocationUpdates();

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

  //to retry connections 
    useEffect(() => {
    const retryConnections = () => {
      const connectedCount = driverIds.filter(id => listeners[id]?.connected).length;
      
      if (connectedCount === 0) {
        console.log('🔄 No sockets connected, this might be due to React Strict Mode. Connections should establish shortly...');
      } else {
        console.log(`✅ ${connectedCount}/${driverIds.length} sockets connected`);
      }
    };

    // Check connection status after a short delay
    const timer = setTimeout(retryConnections, 2000);
    
    return () => clearTimeout(timer);
  }, [listeners, driverIds]);

  // Convert assignments to DriverOrder format and ensure uniqueness
  const assignmentOrdersMap = new Map<string, DriverOrder>();

  Object.entries(assignments).forEach(([driverId, assignment]) => {
    const orderId = assignment.data.orderId;
    
    // Only add if we haven't seen this order ID before
    if (!assignmentOrdersMap.has(orderId)) {
      assignmentOrdersMap.set(orderId, {
        id: orderId,
        status: 'new-assignment' as const,
        market: {
          market_name: assignment.data.marketName,
          address: assignment.data.marketAddress,
        },
        orderItems: assignment.data.items.flatMap((item: any) => 
          item.menuItems.map((menuItem: any) => ({
            restaurantName: item.restaurantName || "",
            restaurantId: item.restaurantId || "",
            itemName: menuItem.name || "", 
            quantity: menuItem.quantity || 1, 
            price: menuItem.unitPrice || 0,
            totalPrice: menuItem.totalPrice || 0, 
            menuItemId: menuItem.menuItemId || "", 
          }))
        ),
        placedAt: assignment.data.assignmentTime,
        cacheKey: assignment.data.cacheKey,
        otp: assignment.data.otp || "", 
        estimatedCompensation: parseFloat(assignment.data.estimatedCompensation || "0"),
        acceptanceDeadline: assignment.data.acceptanceDeadline,
        eventResponseType: assignment.data.eventResponseType,
        assignedDriverId: driverId,
        phoneNumber: assignment.data.number || "",
        retryAttempt: assignment.data.retryAttempt || 0,
        isRetry: assignment.data.isRetry || false,
        urgencyLevel: assignment.data.urgencyLevel || "NORMAL",
      });
    } else {
      console.log(`🔍 Skipping duplicate assignment for order ${orderId} from driver ${driverId}`);
    }
  });

    const assignmentOrders = Array.from(assignmentOrdersMap.values());
    
    //mapping to each column 
    const buckets: Record<string, DriverOrder[]> = {
      //Receives orders for new-assignment events. 
      FINDING_DRIVER: assignmentOrders,
      READY_FOR_PICKUP: [],
      DRIVER_ASSIGNED: [],
      OUT_FOR_DELIVERY: [],
    };

      //Filter orders by selected driver ID for the other columns
    orders
      .forEach(o => { 
        switch (o.status) {        
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

      // ✅ Create a Set of order IDs from REST API buckets only
      const restApiOrderIds = new Set([
        ...buckets.DRIVER_ASSIGNED.map(o => o.id),
        ...buckets.READY_FOR_PICKUP.map(o => o.id),
        ...buckets.OUT_FOR_DELIVERY.map(o => o.id)
      ]);

      // ✅ Only remove assignment orders that exist in REST API buckets
      const duplicateAssignmentIds = assignmentOrders
        .filter(order => restApiOrderIds.has(order.id))
        .map(order => order.id);

      if (duplicateAssignmentIds.length > 0) {
        console.log('🔍 Found assignment orders that exist in REST API:', duplicateAssignmentIds);
        
        // Remove duplicates from FINDING_DRIVER
        buckets.FINDING_DRIVER = buckets.FINDING_DRIVER.filter(order => 
          !restApiOrderIds.has(order.id)
        );
      }

    // filter the other columns by selected driver
    buckets.DRIVER_ASSIGNED = buckets.DRIVER_ASSIGNED.filter(o => 
      o.driverId === selectedDriverId || o.assignedDriverId === selectedDriverId
    );
    buckets.READY_FOR_PICKUP = buckets.READY_FOR_PICKUP.filter(o => 
      o.driverId === selectedDriverId || o.assignedDriverId === selectedDriverId
    );
    buckets.OUT_FOR_DELIVERY = buckets.OUT_FOR_DELIVERY.filter(o => 
      o.driverId === selectedDriverId || o.assignedDriverId === selectedDriverId
    );

    const sendEvent = listeners[selectedDriverId]?.sendEvent || (() => {
      console.warn(`No event listener for driver ${selectedDriverId}`);
    });

    // Sort all buckets by placedAt timestamp (earliest first)
    Object.keys(buckets).forEach(key => {
      buckets[key].sort((a, b) => {
        const aTime = new Date(a.placedAt).getTime();
        const bTime = new Date(b.placedAt).getTime();
        return aTime - bTime; // Earliest first (ascending order)
      });
    });

    if (loading) return <div>Loading orders...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;


   return (
    <div className="p-4 h-screen bg-[#ccdaf5]">
      <h1 className="text-xl font-bold mb-4">Order Dashboard</h1>

      <DriverPicker
        drivers={drivers}
        value={selectedDriverId}
        onChange={(id) => setSelectedDriverId(id)}
      />
      
      <div className="flex gap-4">
        <OrderColumn title="Finding Driver" orders={buckets.FINDING_DRIVER} sendEvent={sendEvent} driverId={selectedDriverId}/>
        <OrderColumn title="Driver Assigned" orders={buckets.DRIVER_ASSIGNED} sendEvent={sendEvent} driverId={selectedDriverId}/>
        <OrderColumn title="Ready for Pickup" orders={buckets.READY_FOR_PICKUP} sendEvent={sendEvent} driverId={selectedDriverId}/>
        <OrderColumn title="Out for Delivery" orders={buckets.OUT_FOR_DELIVERY} sendEvent={sendEvent} driverId={selectedDriverId}/>
      </div>
    </div>
  );
};

export default HomeScreen;