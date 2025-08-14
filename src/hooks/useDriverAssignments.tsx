import { useState, useEffect, useMemo } from 'react';
import useSocket from './useSocket';
import type { NewAssignmentPayload } from '../types/assignments.types';

export const useDriverAssignments = (driverIds: string[]) => {
  const [assignments, setAssignments] = useState<Record<string, any>>({});

  // Create individual socket connections
  const driver1 = useSocket<NewAssignmentPayload>("new-assignment", {
    namespace: "/driver",
    query: { driverId: driverIds[0] }
  });
  const driver2 = useSocket<NewAssignmentPayload>("new-assignment", {
    namespace: "/driver", 
    query: { driverId: driverIds[1] }
  });
  const driver3 = useSocket<NewAssignmentPayload>("new-assignment", {
    namespace: "/driver", 
    query: { driverId: driverIds[2] }
  });
  const driver4 = useSocket<NewAssignmentPayload>("new-assignment", {
    namespace: "/driver", 
    query: { driverId: driverIds[3] }
  });
  const driver5 = useSocket<NewAssignmentPayload>("new-assignment", {
    namespace: "/driver", 
    query: { driverId: driverIds[4] }
  });
  const driver6 = useSocket<NewAssignmentPayload>("new-assignment", {
    namespace: "/driver", 
    query: { driverId: driverIds[5] }
  });

  // ... repeat for each driver

  const listeners = {
    [driverIds[0]]: driver1,
    [driverIds[1]]: driver2,
    [driverIds[2]]: driver3,
    [driverIds[3]]: driver4,
    [driverIds[4]]: driver5,
    [driverIds[5]]: driver6,
  };

  // Log only when component mounts
  useEffect(() => {
    console.log(`🎯 FRONTEND: Setting up listeners for ${driverIds.length} drivers:`, driverIds);
  }, []); // Empty dependency array

  // Update assignments when any listener receives data
  useEffect(() => {
    let hasNewData = false;
    
    Object.entries(listeners).forEach(([driverId, listener]) => {
      if (listener.data) {
        console.log(`📨 Assignment for driver ${driverId}:`, listener.data);
        console.log(`🔑 Cache key:`, listener.data.data.cacheKey);
        hasNewData = true;
        setAssignments(prev => ({
          ...prev,
          [driverId]: listener.data
        }));
      }
    });

    if (hasNewData) {
      console.log(`🔍 FRONTEND: Checking for new assignments...`);
    }
  }, [driver1.data, driver2.data, driver3.data, driver4.data, driver5.data, driver6.data]);

  return {
    assignments,
    listeners,
    connectionStatus: Object.fromEntries(
      Object.entries(listeners).map(([id, listener]) => [id, listener.connected])
    )
  };
};

export default useDriverAssignments;