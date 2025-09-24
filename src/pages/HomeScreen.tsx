import React, { useEffect, useState, useCallback } from "react";
import orderService from "../services/order.service";
import { driverId as longitude, latitude, sampleOrderId } from "../constants";
import OrderColumn from "../components/OrderColumn";
//import DriverPicker from "../components/DriverPicker";
import {type Driver, getDriverDetails} from "../services/driver.service";
import type {DriverOrder} from "../types/order.types";
import { useDriverAssignments } from "../hooks/useDriverAssignments";

const HomeScreen = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    //const [selectedDriverId, setSelectedDriverId] = useState<string>(DEFAULT_DRIVER);
    const [orders, setOrders] = useState<DriverOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
    const [activeDriverIds, setActiveDriverIds] = useState<string[]>([]);

    // Load driver details and filter for available/occupied drivers
    useEffect(() => {
      (async () => {
        try {
          const list = await getDriverDetails();
          setDrivers(list);
          
          // Filter drivers that are available or occupied
          const activeDrivers = list.filter(driver => 
            driver.status === 'available' || driver.status === 'occupied'
          );
          
          const activeIds = activeDrivers.map(driver => driver.id);
          setActiveDriverIds(activeIds);
          
          console.log(`📋 Found ${activeIds.length} active drivers (available/occupied):`, activeIds);
          
        } catch(e: any) {
          console.error('Failed to fetch drivers:', e);
        }
      })();
    }, []);

    const { assignments, listeners } = useDriverAssignments(activeDriverIds);

    const sendLocationUpdates = () => {
      activeDriverIds.forEach(driverId => {
        const listener = listeners[driverId];
        const currentSendEvent = listener?.sendEvent;

        if (currentSendEvent && listeners[driverId]?.connected) {
          const locationPayload = {
            longitude: longitude,
            latitude: latitude,
            orderCache: `${driverId}:${sampleOrderId}:location`,
            timestamp: Date.now()
          };

          currentSendEvent("update-location", locationPayload, (response: any) => {
            // console.log(`✅ update-location response for driver ${driverId}:`, response);
          });
        }
      });
    }

    // Load driver details on mount with the selected Driver Ids
    // useEffect(() => {
    //   (async () => {
    //     try {
    //       const list = await getDriverDetails();
    //       setDrivers(list);

    //       if (!list.find(d => d.id === selectedDriverId) && list[0]) {
    //         setSelectedDriverId(list[0].id);
    //       }
    //     } catch(e: any) {
    //       console.error(e)
    //     }
    //   })();
    // }, [selectedDriverId]);

    // Load driver details on mount
    useEffect(() => {
      (async () => {
        try {
          const list = await getDriverDetails();
          setDrivers(list);
        } catch(e: any) {
          console.error(e)
        }
      })();
    }, []);


    //rest fetch function for selected drivers 
    // const fetchOrders = useCallback(async() => {
    //   if (!selectedDriverId) return;
    //   try {
    //     const data = await orderService.getOrdersByDriver(selectedDriverId);
    //     setOrders(data);
    //     setError(undefined);

    //     //calls to send location updates. 
    //     sendLocationUpdates();

    //   } catch (e: any) {
    //     setError(e?.message || "Failed to load");
    //   }
    //   finally {
    //     setLoading(false);
    //   }
    // }, [selectedDriverId]);

    const fetchOrders = useCallback(async() => {
      try {
        // Fetch orders from all drivers and combine them
        const allOrdersPromises = activeDriverIds.map(driverId => 
          orderService.getOrdersByDriver(driverId).catch(err => {
            console.error(`Failed to fetch orders for driver ${driverId}:`, err);
            return []; // Return empty array if this driver's orders fail
          })
        );

        const allOrdersArrays = await Promise.all(allOrdersPromises);
        const allOrders = allOrdersArrays.flat(); // Flatten the array of arrays

        // Remove duplicates based on order ID
        const uniqueOrders = allOrders.filter((order, index, array) => 
          index === array.findIndex(o => o.id === order.id)
        );

        setOrders(uniqueOrders);
        setError(undefined);

        // Send location updates
        sendLocationUpdates();

      } catch (e: any) {
        setError(e?.message || "Failed to load");
      }
      finally {
        setLoading(false);
      }
    }, []);

    //initial load 
    // useEffect(() => {
    //   setLoading(true);
    //   fetchOrders();
    // }, [fetchOrders]);

    //poll every 1 seconds when page is visible and handle visibility changes
    useEffect(() => {
      const handleVisibilityChange = () => {
        const isVisible = !document.hidden;
        setIsPageVisible(isVisible);

        if (isVisible) {
          console.log("Page became visible - poll every second. ");

          //immediately fetch when page becomes visible 
          fetchOrders();
        } else {
          console.log("Page became hidden - stop polling.");
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // const id = setInterval(fetchOrders, 20_000);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
  }, [fetchOrders]);

    useEffect(() => {
      if (!isPageVisible || activeDriverIds.length === 0) {
        console.log("Page is not visible or no active drivers - skipping fetch.");
        return;
      }

      console.log('Polling available, page is visible. ')
      const id = setInterval(() => {
        if (!document.hidden) { // Double-check visibility
          fetchOrders();
        }
      }, 15_000);

      return () => {
        console.log('clearing polling interval');
        clearInterval(id);
      };
    }, [fetchOrders, isPageVisible, activeDriverIds]);

  //to retry connections 
    useEffect(() => {
    const retryConnections = () => {
      const connectedCount = activeDriverIds.filter(id => listeners[id]?.connected).length;

      if (connectedCount === 0 && activeDriverIds.length > 0) {
        console.log('🔄 No sockets connected, this might be due to React Strict Mode. Connections should establish shortly...');
      } else {
        console.log(`✅ ${connectedCount}/${activeDriverIds.length} sockets connected`);
      }
    };

    // Check connection status after a short delay
    const timer = setTimeout(retryConnections, 2000);
    return () => clearTimeout(timer);
  }, [listeners, activeDriverIds]);

    // Refresh driver list periodically to catch status changes
    useEffect(() => {
      const refreshDrivers = async () => {
        try {
          const list = await getDriverDetails();
          setDrivers(list);
          
          const activeDrivers = list.filter(driver => 
            driver.status === 'available' || driver.status === 'occupied'
          );
          
          const newActiveIds = activeDrivers.map(driver => driver.id);
          
          // Only update if the list has changed
          if (JSON.stringify(newActiveIds.sort()) !== JSON.stringify(activeDriverIds.sort())) {
            console.log(`🔄 Active drivers changed. Old: ${activeDriverIds.length}, New: ${newActiveIds.length}`);
            setActiveDriverIds(newActiveIds);
          }
          
        } catch(e: any) {
          console.error('Failed to refresh drivers:', e);
        }
      };

      // Refresh driver list every 30 seconds
      const interval = setInterval(refreshDrivers, 30000);
      return () => clearInterval(interval);
    }, [activeDriverIds]);

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
      //console.log(`🔍 Skipping duplicate assignment for order ${orderId} from driver ${driverId}`);
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

      //Create a Set of order IDs from REST API buckets only
      const restApiOrderIds = new Set([
        ...buckets.DRIVER_ASSIGNED.map(o => o.id),
        ...buckets.READY_FOR_PICKUP.map(o => o.id),
        ...buckets.OUT_FOR_DELIVERY.map(o => o.id)
      ]);

      //Only remove assignment orders that exist in REST API buckets
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

      //driver ID specific code 
    // filter the other columns by selected driver
    // buckets.DRIVER_ASSIGNED = buckets.DRIVER_ASSIGNED.filter(o => 
    //   o.driverId === selectedDriverId || o.assignedDriverId === selectedDriverId
    // );
    // buckets.READY_FOR_PICKUP = buckets.READY_FOR_PICKUP.filter(o => 
    //   o.driverId === selectedDriverId || o.assignedDriverId === selectedDriverId
    // );
    // buckets.OUT_FOR_DELIVERY = buckets.OUT_FOR_DELIVERY.filter(o => 
    //   o.driverId === selectedDriverId || o.assignedDriverId === selectedDriverId
    // );

    // const sendEvent = listeners[selectedDriverId]?.sendEvent || (() => {
    //   //console.warn(`No event listener for driver ${selectedDriverId}`);
    // });

    // Use a generic sendEvent function that tries to find the right listener
   const sendEvent = (evt: string, payload: any, callback?: (response: any) => void) => {
  // For order-accept, broadcast to ALL connected drivers
  if (evt === "order-accept") {
    console.log(`📡 Broadcasting ${evt} to all connected drivers:`, payload);
    
    let responseCount = 0;
    const totalListeners = Object.keys(listeners).length;
    const responses: any[] = [];

    if (totalListeners === 0) {
      console.warn(`No listeners available for broadcasting ${evt}`);
      if (callback) callback({ success: false, reason: 'No listeners available' });
      return;
    }

    // Send to all connected drivers
    Object.entries(listeners).forEach(([driverId, listener]) => {
      if (listener?.sendEvent && listener.connected) {
        listener.sendEvent(evt, payload, (response: any) => {
          responseCount++;
          responses.push({ driverId, response });
          console.log(`📨 ${evt} response from driver ${driverId}:`, response);
          
          // Call callback with combined results when all responses received
          if (responseCount === totalListeners && callback) {
            callback({ 
              success: true, 
              broadcasted: true,
              responses: responses,
              totalSent: totalListeners
            });
          }
        });
      } else {
        responseCount++;
        console.warn(`Skipping driver ${driverId} - not connected`);
        
        if (responseCount === totalListeners && callback) {
          callback({ 
            success: true, 
            broadcasted: true,
            responses: responses,
            totalSent: responses.length
          });
        }
      }
    });

    return; // Exit early for order-accept
  }

  // For other events, try to find specific driver (existing logic)
  const driverId = payload.driverId || payload.assignedDriverId;
  
  if (!driverId) {
    console.error(`❌ No driver ID found in payload for ${evt}:`, payload);
    if (callback) callback({ success: false, reason: 'No driver ID' });
    return;
  }

  const listener = listeners[driverId];
  
  if (listener?.sendEvent && listener.connected) {
    listener.sendEvent(evt, payload, callback);
  } else {
    console.warn(`No event listener available for driver ${driverId}`);
    if (callback) callback({ success: false, reason: 'No listener' });
  }
};

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
      <h1 className="text-xl font-bold mb-4">Admin Dashboard</h1>

        {/* remove driver picker for now. */}
      {/* <DriverPicker
        drivers={drivers}
        value={selectedDriverId}
        onChange={(id) => setSelectedDriverId(id)}
      /> */}
      
      <div className="flex gap-4">
        <OrderColumn title="Finding Driver" orders={buckets.FINDING_DRIVER} sendEvent={sendEvent} driverId="all"/>
        <OrderColumn title="Driver Assigned" orders={buckets.DRIVER_ASSIGNED} sendEvent={sendEvent} driverId="all"/>
        <OrderColumn title="Ready for Pickup" orders={buckets.READY_FOR_PICKUP} sendEvent={sendEvent} driverId="all"/>
        <OrderColumn title="Out for Delivery" orders={buckets.OUT_FOR_DELIVERY} sendEvent={sendEvent} driverId="all"/>
      </div>
    </div>
  );
};

export default HomeScreen;