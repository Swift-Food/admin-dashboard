import { useState, useEffect, useRef } from 'react';
import useSocket from './useSocket';
import type { NewAssignmentPayload } from '../types/assignments.types';

export const useDriverAssignments = (driverIds: string[]) => {
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [listeners, setListeners] = useState<Record<string, any>>({});
  const prevDriverIds = useRef<string[]>([]);

  // Maximum number of concurrent socket connections (adjust as needed)
  const MAX_CONNECTIONS = 20;

  // Create socket connections for up to MAX_CONNECTIONS drivers
  const socketConnections = Array.from({ length: MAX_CONNECTIONS }, (_, index) => {
    const driverId = driverIds[index] || null;
    
    return {
      index,
      driverId,
      socket: useSocket<NewAssignmentPayload>("new-assignment", {
        namespace: "/driver",
        query: { driverId: driverId || '' }, // Pass empty string if no driver
        enabled: !!driverId // Only connect if we have a valid driverId
      }),
      enabled: !!driverId
    };
  });


  useEffect(() => {
    // Check if driver list has changed
    const currentIds = [...driverIds].sort();
    const previousIds = [...prevDriverIds.current].sort();
    
    if (JSON.stringify(currentIds) !== JSON.stringify(previousIds)) {
      console.log('🔄 Driver list changed:', {
        previous: previousIds,
        current: currentIds,
        added: currentIds.filter(id => !previousIds.includes(id)),
        removed: previousIds.filter(id => !currentIds.includes(id))
      });

      // Clear assignments for removed drivers
      const removedDrivers = previousIds.filter(id => !currentIds.includes(id));
      if (removedDrivers.length > 0) {
        setAssignments(prev => {
          const newAssignments = { ...prev };
          removedDrivers.forEach(driverId => {
            delete newAssignments[driverId];
          });
          return newAssignments;
        });
      }
    }

    prevDriverIds.current = driverIds;

    // Update listeners object
    const newListeners: Record<string, any> = {};
    
    socketConnections.forEach(({ driverId, socket, enabled }) => {
      if (enabled && driverId) {
        newListeners[driverId] = socket;
      }
    });

    setListeners(newListeners);

    console.log(`🎯 FRONTEND: Setting up listeners for ${Object.keys(newListeners).length} drivers:`, Object.keys(newListeners));
  }, [driverIds, ...socketConnections.map(conn => conn.socket.connected)]);

  // Update assignments when any socket receives data
  useEffect(() => {
    let hasNewData = false;
    
    socketConnections.forEach(({ driverId, socket, enabled }) => {
      if (enabled && driverId && socket.data) {
        hasNewData = true;
        setAssignments(prev => ({
          ...prev,
          [driverId]: socket.data
        }));
      }
    });

    if (hasNewData) {
      console.log(`🔍 FRONTEND: Checking for new assignments...`);
    }
  }, [...socketConnections.map(conn => conn.socket.data)]);

  return {
    assignments,
    listeners,
    connectionStatus: Object.fromEntries(
      Object.entries(listeners).map(([id, listener]) => [id, listener.connected])
    )
  };
};



export default useDriverAssignments;