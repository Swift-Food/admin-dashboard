import { useState, useEffect } from 'react';
import useSocket from './useSocket';
import type { NewAssignmentPayload } from '../types/assignments.types';

export const useDriverAssignments = (driverIds: string[]) => {
  const [assignments, setAssignments] = useState<Record<string, any>>({});

  console.log(`🎯 FRONTEND: Setting up listeners for ${driverIds.length} drivers:`, driverIds);
  
  // Create all listeners
  const listeners = driverIds.reduce((acc, driverId) => {
    console.log(`🔌 FRONTEND: Creating listener for driver ${driverId}`);
    acc[driverId] = useSocket<NewAssignmentPayload>("new-assignment", {
      namespace: "/driver",
      query: { driverId }
    });

     // Log connection status
    if (acc[driverId].connected) {
      console.log(`✅ FRONTEND: Driver ${driverId} connected successfully`);
    } else {
      console.log(`❌ FRONTEND: Driver ${driverId} not connected`);
    }

    return acc;
  }, {} as Record<string, any>);

  // Update assignments when any listener receives data
  useEffect(() => {
    console.log(`🔍 FRONTEND: Checking for new assignments...`);

    Object.entries(listeners).forEach(([driverId, listener]) => {
      if (listener.data) {

        console.log(`🚨 FRONTEND: NEW ASSIGNMENT received for driver ${driverId}:`, listener.data);
        console.log(`📦 FRONTEND: Order ID: ${listener.data.data.orderId}`);
        console.log(`🏪 FRONTEND: Market: ${listener.data.data.marketName}`);
        console.log(`💰 FRONTEND: Compensation: $${listener.data.data.estimatedCompensation}`);

        setAssignments(prev => ({
          ...prev,
          [driverId]: listener.data
        }));
      }
    });
  }, [Object.values(listeners).map(l => l.data)]);

  return {
    assignments,
    listeners,
    connectionStatus: Object.fromEntries(
      Object.entries(listeners).map(([id, listener]) => [id, listener.connected])
      
    )
  };
};

export default useDriverAssignments;