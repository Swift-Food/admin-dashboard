import React, { useEffect, useState } from 'react';
import DriverRow from '../components/DriverRow';
import { getDriverDetails } from '../services/driver.service';
import type { Driver } from '../types/driver.types';

const DriversScreen: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false); // Track polling state

  useEffect(() => {
    const fetchDrivers = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true); // Only show loading on initial load
        } else {
          setIsPolling(true); // Show polling indicator instead
        }
        setError(null);
        
        const driverData = await getDriverDetails();
        setDrivers(driverData);
      } catch (err) {
        console.error('Failed to fetch drivers:', err);
        setError('Failed to load drivers');
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setIsPolling(false);
        }
      }
    };

    // Initial load
    fetchDrivers(true);

    // Set up polling for updates (not initial load)
    const interval = setInterval(() => fetchDrivers(false), 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>Loading drivers...</div>
      </div>
    );
  }
  console.log("isPolling", isPolling)
  if (error) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#dc2626' }}>
        <div>{error}</div>
      </div>
    );
  }

  // Group drivers by status
  const occupiedDrivers = drivers.filter(d => d.status === 'occupied');
  const availableDrivers = drivers.filter(d => d.status === 'available');
  const unavailableDrivers = drivers.filter(d => d.status === 'unavailable');

  return (
    <div style={{ padding: 20, backgroundColor: '#ccdaf5', minHeight: '100vh' }}>
      <h1 className="text-xl font-bold mb-4">Driver Management</h1>
      
      {/* Occupied drivers first */}
      {occupiedDrivers.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="font-bold m-4 text-green-900">
            Occupied Drivers ({occupiedDrivers.length})
          </h2>
          {occupiedDrivers.map(driver => (
            <DriverRow key={driver.id} driver={driver} />
          ))}
        </div>
      )}

      {/* Available drivers */}
      {availableDrivers.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="font-bold m-4 text-amber-900">
            Available Drivers ({availableDrivers.length})
          </h2>
          {availableDrivers.map(driver => (
            <DriverRow key={driver.id} driver={driver} />
          ))}
        </div>
      )}

      {/* Unavailable drivers */}
      {unavailableDrivers.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className ="font-bold m-4 text-red-800">
            Unavailable Drivers ({unavailableDrivers.length})
          </h2>
          {unavailableDrivers.map(driver => (
            <DriverRow key={driver.id} driver={driver} />
          ))}
        </div>
      )}

      {drivers.length === 0 && (
        <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>
          No drivers found
        </div>
      )}
    </div>
  );
};

export default DriversScreen;