import React, { useState, useEffect } from 'react';
import { getDriverDetails } from '../services/driver.service';
import driverAnalyticsService, { 
  type DriverPerformanceStats, 
  type DailyStats, 
  type HourlyEarnings 
} from '../services/driverAnalytics.service';
import type { Driver } from '../types/driver.types';
import PerformanceOverview from '../components/PerformanceOverview';
import DailyChart from '../components/SimpleChart';

const StatisticsScreen: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [allDriverStats, setAllDriverStats] = useState<Record<string, {
    performance: DriverPerformanceStats;
    dailyStats: DailyStats[];
    hourlyEarnings: HourlyEarnings[];
  }>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load drivers on mount
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const driverData = await getDriverDetails();
        setDrivers(driverData);
        console.log(`📋 Loaded ${driverData.length} drivers`);
      } catch (err) {
        console.error('Failed to load drivers:', err);
        setError('Failed to load drivers');
      }
    };
    loadDrivers();
  }, []);

  // Handle driver selection
  const handleDriverToggle = (driverId: string) => {
    setSelectedDriverIds(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDriverIds.length === drivers.length) {
      setSelectedDriverIds([]);
    } else {
      setSelectedDriverIds(drivers.map(d => d.id));
    }
  };

  // Load statistics for selected drivers
  useEffect(() => {
    const loadSelectedDriverStats = async () => {
      if (selectedDriverIds.length === 0) {
        setAllDriverStats({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`📊 Loading stats for ${selectedDriverIds.length} drivers`);
        
        const statsPromises = selectedDriverIds.map(async (driverId) => {
          try {
            const [performance, dailyStats, hourlyEarnings] = await Promise.all([
              driverAnalyticsService.getDriverPerformanceStats(driverId),
              driverAnalyticsService.getDriverDateRangeStats(
                driverId, 
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                new Date().toISOString().split('T')[0]
              ),
              driverAnalyticsService.getDriverHourlyEarnings(driverId, new Date().toISOString().split('T')[0])
            ]);

            return { driverId, performance, dailyStats, hourlyEarnings };
          } catch (err) {
            console.error(`Failed to load stats for driver ${driverId}:`, err);
            return null;
          }
        });

        const results = await Promise.all(statsPromises);
        
        const newStats: typeof allDriverStats = {};
        results.forEach(result => {
          if (result) {
            newStats[result.driverId] = {
              performance: result.performance,
              dailyStats: result.dailyStats,
              hourlyEarnings: result.hourlyEarnings
            };
          }
        });

        setAllDriverStats(newStats);
        console.log(`📊 Loaded stats for ${Object.keys(newStats).length} drivers`);
      } catch (err: any) {
        console.error('Failed to load statistics:', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    loadSelectedDriverStats();
  }, [selectedDriverIds]);

  return (
    <div style={{ padding: 24, backgroundColor: '#ccdaf5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Driver Statistics
          </h1>
          <p style={{ color: '#000000', fontSize: 16, margin: '8px 0 0 0' }}>
            Select multiple drivers to view their performance statistics
          </p>
        </div>

        {/* Driver Selection */}
        <div style={{ 
          backgroundColor: '#ebf2ff', 
          borderRadius: 12, 
          padding: 24, 
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: '#000000' }}>Select Drivers:</h3>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '6px 12px',
                backgroundColor: selectedDriverIds.length === drivers.length ? '#dc2626' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {selectedDriverIds.length === drivers.length ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ fontSize: 14, color: '#6b7280' }}>
              ({selectedDriverIds.length} of {drivers.length} selected)
            </span>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 8,
            maxHeight: 300,
            overflowY: 'auto',
            borderRadius: 8,
            padding: 12
          }}>
            {drivers.map(driver => (
              <label
                key={driver.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: selectedDriverIds.includes(driver.id) ? '#dbeafe' : 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#000000'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDriverIds.includes(driver.id)}
                  onChange={() => handleDriverToggle(driver.id)}
                />
                <span style={{ flex: 1 }}>
                  {driver.user?.username || `Driver ${driver.id.slice(0, 8)}`}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 14
          }}>
            ❌ {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 200,
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 18, color: '#6b7280' }}>
              📊 Loading statistics for {selectedDriverIds.length} driver(s)...
            </div>
          </div>
        )}

        {/* Driver Statistics - Vertical Layout */}
        {selectedDriverIds.length > 0 && Object.keys(allDriverStats).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {selectedDriverIds.map(driverId => {
              const driver = drivers.find(d => d.id === driverId);
              const stats = allDriverStats[driverId];
              
              if (!driver || !stats) return null;

              return (
                <div 
                  key={driverId} 
                  style={{ 
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '2px solid #e5e7eb'
                  }}
                >
                  {/* Driver Header */}
                  <div style={{ 
                    marginBottom: 24, 
                    borderBottom: '2px solid #f3f4f6', 
                    paddingBottom: 16 
                  }}>
                    <h2 style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold', 
                      color: '#1f2937', 
                      margin: 0,
                      marginBottom: 4
                    }}>
                      {driver.user?.username || 'Unknown Driver'}
                    </h2>
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: 14, 
                      margin: 0 
                    }}>
                      Driver ID: {driver.id} • Status: 
                      <span style={{
                        marginLeft: 4,
                        textTransform: 'capitalize',
                        fontWeight: 'bold',
                        color: 
                          driver.status === 'available' ? '#059669' :
                          driver.status === 'occupied' ? '#dc2626' : '#6b7280'
                      }}>
                        {driver.status}
                      </span>
                    </p>
                  </div>

                  {/* Performance Overview */}
                  <PerformanceOverview 
                    driver={driver} 
                    stats={stats.performance} 
                  />

                  {/* Charts */}
                  {stats.dailyStats.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <DailyChart 
                        data={stats.dailyStats}
                        title="Daily Performance (Last 7 Days)"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No Selection State */}
        {selectedDriverIds.length === 0 && drivers.length > 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: 48, 
            color: '#6b7280',
            backgroundColor: 'white',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#374151' }}>
              No Drivers Selected
            </h3>
            <p style={{ margin: 0 }}>
              Please select one or more drivers above to view their performance statistics.
            </p>
          </div>
        )}

        {/* No Drivers Available */}
        {drivers.length === 0 && !loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: 48, 
            color: '#6b7280',
            backgroundColor: 'white',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#374151' }}>No Drivers Available</h3>
            <p style={{ margin: 0 }}>There are no drivers in the system to display statistics for.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsScreen;