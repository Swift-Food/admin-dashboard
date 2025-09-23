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
  const [mapReady, setMapReady] = useState<boolean>(false); 
  
  // Refs for tracking previous data to prevent unnecessary re-renders
  const previousDriversRef = useRef<Driver[]>([]);
  const intervalRef = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Memoized filter to prevent recalculation on every render
  const trackableDrivers = React.useMemo(() => 
    drivers.filter(driver => 
      driver.currentLocation && 
      (driver.status === 'available' || driver.status === 'occupied')
    ), [drivers]
  );

  // Optimized fetch function with comparison
  const fetchDriverLocations = useCallback(async () => {
    try {
      setError(null);
      const driverData = await getDriverDetails();
      
      // Only update if data actually changed
      const hasChanged = JSON.stringify(driverData) !== JSON.stringify(previousDriversRef.current);
      
      if (hasChanged) {
        setDrivers(driverData);
        setLastUpdated(new Date());
        previousDriversRef.current = driverData;
        console.log(`📍 Updated ${driverData.length} driver locations`);
      } else {
        console.log('📍 No driver location changes detected');
      }
    } catch (err: any) {
      console.error('Failed to fetch driver locations:', err);
      setError('Failed to load driver locations');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    // Wait for DOM to be ready, then initialize map
    const initializeMap = () => {
      if (mapContainerRef.current) {
        console.log('📍 Map container found, initializing map...');
        setMapReady(true);
      } else {
        console.log('📍 Map container not ready, retrying...');
        // Retry after a short delay
        setTimeout(initializeMap, 100);
      }
    };

    // Small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(initializeMap, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Run once on mount

  // ✅ Fetch drivers only after map is ready
  useEffect(() => {
    if (mapReady) {
      fetchDriverLocations();
    }
  }, [mapReady, fetchDriverLocations]);

  // Optimized polling - only when page is visible
  useEffect(() => {
    if (!isPageVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Shorter interval for more real-time tracking (3 seconds instead of 5)
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


    // Calculate map bounds to show all drivers
  const mapBounds = React.useMemo(() => {
    if (trackableDrivers.length === 0) return null;
    
    const lats = trackableDrivers.map(d => d.currentLocation!.latitude);
    const lngs = trackableDrivers.map(d => d.currentLocation!.longitude);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [trackableDrivers]);

  // Default center (London)
  const defaultCenter: [number, number] = [51.5074, -0.1278];

  // Enhanced statistics
  const stats = React.useMemo(() => ({
    total: drivers.length,
    available: drivers.filter(d => d.status === 'available').length,
    occupied: drivers.filter(d => d.status === 'occupied').length,
    unavailable: drivers.filter(d => d.status === 'unavailable').length,
    trackable: trackableDrivers.length
  }), [drivers, trackableDrivers]);

  if (loading || !mapReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        {!mapReady ? '🗺️ Preparing map...' : 'Loading driver locations...'}
      </div>
    );
  }

  return (
     <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
    {/* Enhanced Header with better statistics */}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              backgroundColor: '#22c55e', 
              borderRadius: '50%' 
            }}></div>
            <span style={{ fontSize: 13 }}>Available ({stats.available})</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              backgroundColor: '#ef4444', 
              borderRadius: '50%' 
            }}></div>
            <span style={{ fontSize: 13 }}>Occupied ({stats.occupied})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              backgroundColor: '#6b7280', 
              borderRadius: '50%' 
            }}></div>
            <span style={{ fontSize: 13 }}>Unavailable ({stats.unavailable})</span>
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

    {/* Map Container - Full height with proper positioning */}
    <div 
    ref={mapContainerRef}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    }}>
    {mapReady && (
      <MapContainer
        center={mapBounds ? 
          [(mapBounds.north + mapBounds.south) / 2, (mapBounds.east + mapBounds.west) / 2] : 
          defaultCenter
        }
        zoom={mapBounds ? 11 : 12}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
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
                    ID: {driver.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    )}
    </div>
  </div>
);
};

export default MapScreen;