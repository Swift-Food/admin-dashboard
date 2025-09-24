import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getDriverDetails } from '../services/driver.service';
import type { Driver } from '../types/driver.types';

// Fix for default markers in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom icons for different driver statuses
const availableIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const occupiedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapScreen: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  console.log('mapscreen render:', {
    driversCount: drivers.length, 
    loading,
    error
  });
  
  // Refs for tracking previous data to prevent unnecessary re-renders
  const previousDriversRef = useRef<Driver[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Memoized filter to prevent recalculation on every render
  const trackableDrivers = React.useMemo(() => 
    drivers.filter(driver => 
      driver.currentLocation && 
      (driver.status === 'available' || driver.status === 'occupied' || driver.status === 'unavailable'
      )
    ), [drivers]
  );

  // Optimized fetch function with comparison
  const fetchDriverLocations = useCallback(async () => {
    try {
      setError(null);
      const driverData = await getDriverDetails();
      
      // Debug the fetched data
      console.log('📍 Fetched driver data:', driverData);
      console.log('📍 First driver with location:', driverData.find(d => d.currentLocation));
      
      // Only update if data actually changed
      const hasChanged = JSON.stringify(driverData) !== JSON.stringify(previousDriversRef.current);
      
      if (hasChanged) {
        setDrivers(driverData);
        setLastUpdated(new Date());
        previousDriversRef.current = driverData;
        console.log(`📍 Updated ${driverData.length} driver locations`);
        
        // Log trackable drivers
        const trackable = driverData.filter(driver => 
          driver.currentLocation && 
          (driver.status === 'available' || driver.status === 'occupied')
        );
        console.log(`📍 Found ${trackable.length} trackable drivers`);
      }
    } catch (err: any) {
      console.error('Failed to fetch driver locations:', err);
      setError('Failed to load driver locations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      
      if (isVisible) {
        console.log('📱 Map page visible - resuming location updates');
        fetchDriverLocations();
      } else {
        console.log('📱 Map page hidden - pausing location updates');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDriverLocations]);

  // Initial fetch
  useEffect(() => {
    fetchDriverLocations();
  }, [fetchDriverLocations]);

  // Polling
  useEffect(() => {
    if (!isPageVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchDriverLocations();
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchDriverLocations, isPageVisible]);

  const centralLondonBounds: [[number, number], [number, number]] = [
    [51.4700, -0.2300], // Southwest corner (latitude, longitude)
    [51.5400, -0.0500]  // Northeast corner (latitude, longitude)
  ];

  const centralLondonCenter: [number, number] = [51.5074, -0.1278]; // London center

  // Enhanced statistics
  const stats = React.useMemo(() => ({
    total: drivers.length,
    available: drivers.filter(d => d.status === 'available').length,
    occupied: drivers.filter(d => d.status === 'occupied').length,
    unavailable: drivers.filter(d => d.status === 'unavailable').length,
    trackable: trackableDrivers.length
  }), [drivers, trackableDrivers]);

  // Only show loading if we haven't fetched any data yet
  if (loading && drivers.length === 0) {
    console.log('🔄 Initial loading...');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        🗺️ Loading driver locations...
      </div>
    );
  }

  console.log('🗺️ Rendering map with', trackableDrivers.length, 'trackable drivers');

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>

      {/* Header to display available, occupied and unavailable drivers */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', 
          flexDirection: 'column', // Stack title and content vertically
          alignItems: 'center',    // Center everything horizontally
          gap: 12  }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>
              Driver Location Tracker
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 14 }}>
              Tracking {stats.trackable}/{stats.total} drivers • 
              Last updated: {lastUpdated.toLocaleTimeString()}
              {!isPageVisible && ' (⏸️ Paused)'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ 
                width: 12, 
                height: 12,
                backgroundColor: '#22c55e', 
                borderRadius: '50%',
              }}></div>
              <span style={{ fontSize: 13, color: '#000000' }}>Available ({stats.available})</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6}}>
              <div style={{ 
                width: 12, 
                height: 12, 
                backgroundColor: '#ef4444', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ fontSize: 13, color: '#000000' }}>Occupied ({stats.occupied})</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                backgroundColor: '#6b7280', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ fontSize: 13, color: '#000000' }}>Unavailable ({stats.unavailable})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          position: 'absolute',
          top: 100,
          left: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: 12,
          borderRadius: 8,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={centralLondonCenter}
        zoom={13} // Higher zoom for city view
        minZoom={11} // Prevent zooming out too far
        maxZoom={18} // Allow detailed street view
        maxBounds={centralLondonBounds} // Restrict panning outside London
        maxBoundsViscosity={1.0} // Make bounds "sticky"
        style={{ 
          height: '100vh', 
          width: '100%'
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          minZoom={11} // Match map minZoom
          maxZoom={18} // Match map maxZoom
        />
        
        {/* Always show a test marker first */}
        <Marker position={centralLondonCenter}>
          <Popup>
            📍 London Test Marker<br/>
            Found {trackableDrivers.length} trackable drivers
          </Popup>
        </Marker>
        
        {/* Render driver markers */}
        {trackableDrivers.map((driver) => (
          <Marker
            key={`${driver.id}-${driver.currentLocation!.latitude}-${driver.currentLocation!.longitude}`}
            position={[driver.currentLocation!.latitude, driver.currentLocation!.longitude]}
            icon={driver.status === 'available' ? availableIcon : occupiedIcon}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>
                  {driver.user?.username || 'Unknown Driver'}
                </h3>
                
                <div style={{ fontSize: 14, color: '#666' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Status:</strong> 
                    <span style={{ 
                      color: driver.status === 'available' ? '#22c55e' : '#ef4444',
                      marginLeft: 4,
                      textTransform: 'capitalize'
                    }}>
                      {driver.status}
                    </span>
                  </p>
                  
                  <p style={{ margin: '4px 0' }}>
                    <strong>Rating:</strong> {driver.rating || 'N/A'} ⭐
                  </p>
                  
                  <p style={{ margin: '4px 0' }}>
                    <strong>Points:</strong> {driver.points || '0'}
                  </p>
                  
                  <p style={{ margin: '4px 0' }}>
                    <strong>Location:</strong><br/>
                    {driver.currentLocation!.latitude.toFixed(4)}, {driver.currentLocation!.longitude.toFixed(4)}
                  </p>
                  
                  <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
                    ID: {driver.id.slice(0, 8)}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapScreen;