// import React, { useEffect, useState } from 'react';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import L from 'leaflet';
// import { getDriverDetails } from '../services/driver.service';
// import type { Driver } from '../types/driver.types';
// import 'leaflet/dist/leaflet.css';

// // Fix for default markers in React Leaflet
// import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// import markerIcon from 'leaflet/dist/images/marker-icon.png';
// import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconUrl: markerIcon,
//   iconRetinaUrl: markerIcon2x,
//   shadowUrl: markerShadow,
// });

// // Custom icons for different driver statuses
// const availableIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
//   shadowUrl: markerShadow,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const occupiedIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
//   shadowUrl: markerShadow,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const MapScreen: React.FC = () => {
//   const [drivers, setDrivers] = useState<Driver[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

//   // Filter drivers that have locations and are available/occupied
//   const trackableDrivers = drivers.filter(driver => 
//     driver.currentLocation && 
//     (driver.status === 'available' || driver.status === 'occupied')
//   );

//   const fetchDriverLocations = async () => {
//     try {
//       setError(null);
//       const driverData = await getDriverDetails();
//       setDrivers(driverData);
//       setLastUpdated(new Date());
//       console.log(`📍 Updated ${driverData.length} driver locations`);
//     } catch (err: any) {
//       console.error('Failed to fetch driver locations:', err);
//       setError('Failed to load driver locations');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Initial fetch
//   useEffect(() => {
//     fetchDriverLocations();
//   }, []);

//   // Fetch every 5 seconds
//   useEffect(() => {
//     const interval = setInterval(fetchDriverLocations, 5000);
//     return () => clearInterval(interval);
//   }, []);

//   // Default center (London)
//   const defaultCenter: [number, number] = [51.5074, -0.1278];

//   if (loading) {
//     return (
//       <div style={{ 
//         display: 'flex', 
//         justifyContent: 'center', 
//         alignItems: 'center', 
//         height: '100vh',
//         fontSize: '18px'
//       }}>
//         Loading driver locations...
//       </div>
//     );
//   }

//   return (
//     <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
//       {/* Header */}
//       <div style={{
//         position: 'absolute',
//         top: 16,
//         left: 16,
//         right: 16,
//         zIndex: 1000,
//         backgroundColor: 'white',
//         padding: 16,
//         borderRadius: 8,
//         boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//         display: 'flex',
//         justifyContent: 'space-between',
//         alignItems: 'center'
//       }}>
//         <div>
//           <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>
//             Driver Location Tracker
//           </h1>
//           <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 14 }}>
//             Tracking {trackableDrivers.length} drivers • 
//             Last updated: {lastUpdated.toLocaleTimeString()}
//           </p>
//         </div>
        
//         <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//             <div style={{ 
//               width: 12, 
//               height: 12, 
//               backgroundColor: '#22c55e', 
//               borderRadius: '50%' 
//             }}></div>
//             <span style={{ fontSize: 14 }}>Available ({drivers.filter(d => d.status === 'available').length})</span>
//           </div>
          
//           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//             <div style={{ 
//               width: 12, 
//               height: 12, 
//               backgroundColor: '#ef4444', 
//               borderRadius: '50%' 
//             }}></div>
//             <span style={{ fontSize: 14 }}>Occupied ({drivers.filter(d => d.status === 'occupied').length})</span>
//           </div>
//         </div>
//       </div>

//       {/* Error banner */}
//       {error && (
//         <div style={{
//           position: 'absolute',
//           top: 100,
//           left: 16,
//           right: 16,
//           zIndex: 1000,
//           backgroundColor: '#fef2f2',
//           border: '1px solid #fecaca',
//           color: '#dc2626',
//           padding: 12,
//           borderRadius: 8,
//           fontSize: 14
//         }}>
//           {error}
//         </div>
//       )}

//       {/* Map */}
//       <MapContainer
//         center={defaultCenter}
//         zoom={12}
//         style={{ height: '100%', width: '100%' }}
//       >
//         <TileLayer
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />
        
//         {trackableDrivers.map((driver) => (
//           <Marker
//             key={driver.id}
//             position={[driver.currentLocation!.latitude, driver.currentLocation!.longitude]}
//             icon={driver.status === 'available' ? availableIcon : occupiedIcon}
//           >
//             <Popup>
//               <div style={{ minWidth: 200 }}>
//                 <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>
//                   {driver.user?.username || 'Unknown Driver'}
//                 </h3>
                
//                 <div style={{ fontSize: 14, color: '#666' }}>
//                   <p style={{ margin: '4px 0' }}>
//                     <strong>Status:</strong> 
//                     <span style={{ 
//                       color: driver.status === 'available' ? '#22c55e' : '#ef4444',
//                       marginLeft: 4,
//                       textTransform: 'capitalize'
//                     }}>
//                       {driver.status}
//                     </span>
//                   </p>
                  
//                   <p style={{ margin: '4px 0' }}>
//                     <strong>Rating:</strong> {driver.rating || 'N/A'} ⭐
//                   </p>
                  
//                   <p style={{ margin: '4px 0' }}>
//                     <strong>Points:</strong> {driver.points || '0'}
//                   </p>
                  
//                   <p style={{ margin: '4px 0' }}>
//                     <strong>Location:</strong><br/>
//                     {driver.currentLocation!.latitude.toFixed(4)}, {driver.currentLocation!.longitude.toFixed(4)}
//                   </p>
                  
//                   <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
//                     ID: {driver.id.slice(0, 8)}...
//                   </p>
//                 </div>
//               </div>
//             </Popup>
//           </Marker>
//         ))}
//       </MapContainer>
//     </div>
//   );
// };

// export default MapScreen;