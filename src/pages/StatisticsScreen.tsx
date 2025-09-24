import React, { useState, useEffect } from 'react';
import { getDriverDetails } from '../services/driver.service';
import driverAnalyticsService, { 
  type DriverPerformanceStats, 
  type DailyStats, 
  type HourlyEarnings 
} from '../services/driverAnalytics.service';
import type { Driver } from '../types/driver.types';
import DriverPicker from '../components/DriverPicker';
import PerformanceOverview from '../components/PerformanceOverview';
import DailyChart from '../components/SimpleChart';
// import HourlyChart from '../components/HourlyChart';

const StatisticsScreen: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [performanceStats, setPerformanceStats] = useState<DriverPerformanceStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [hourlyEarnings, setHourlyEarnings] = useState<HourlyEarnings[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });

  // Load drivers on mount
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const driverData = await getDriverDetails();
        setDrivers(driverData);
        if (driverData.length > 0) {
          setSelectedDriverId(driverData[0].id);
        }
      } catch (err) {
        console.error('Failed to load drivers:', err);
        setError('Failed to load drivers');
      }
    };
    loadDrivers();
  }, []);

  // Load statistics when driver or date range changes
  useEffect(() => {
    if (selectedDriverId) {
      loadDriverStatistics();
    }
  }, [selectedDriverId, dateRange]);

  const loadDriverStatistics = async () => {
    if (!selectedDriverId) return;

    setLoading(true);
    setError(null);

    try {
      // Load performance stats
      const performance = await driverAnalyticsService.getDriverPerformanceStats(selectedDriverId);
      setPerformanceStats(performance);

      // Load daily stats for date range
      const daily = await driverAnalyticsService.getDriverDateRangeStats(
        selectedDriverId, 
        dateRange.startDate, 
        dateRange.endDate
      );
      setDailyStats(daily);

      // Load hourly earnings for today
      const today = new Date().toISOString().split('T')[0];
      const hourly = await driverAnalyticsService.getDriverHourlyEarnings(selectedDriverId, today);
      setHourlyEarnings(hourly);

    } catch (err: any) {
      console.error('Failed to load statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  return (
    <div style={{ padding: 24, backgroundColor: '#ccdaf5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className = "text-xl font-bold mb-4">
          Driver Statistics
        </h1>
        <p style={{ color: '#000000', fontSize: 16, margin: '8px 0 0 0' }}>
          Analyze driver performance, earnings, and delivery metrics
        </p>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <DriverPicker
          drivers={drivers}
          value = {selectedDriverId}
          onChange={setSelectedDriverId}
          disabled={loading}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 14, color: '#374151' }}>Start Date:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 14, color: '#374151' }}>End Date:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14
            }}
          />
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
          marginBottom: 24
        }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 200 
        }}>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Loading statistics...</div>
        </div>
      )}

      {/* Statistics Content */}
      {selectedDriver && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Performance Overview */}
          <PerformanceOverview 
            driver={selectedDriver} 
            stats={performanceStats} 
          />
        <div/>

          {/* Charts Container */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 24 
          }}>
            {/* Daily Performance Chart */}
            {dailyStats.length > 0 && (
              <DailyChart 
                data={dailyStats}
                title="Daily Performance"
              />
            )}

            {/* Hourly Earnings Chart */}
            {/* {hourlyEarnings.length > 0 && (
              <HourlyChart 
                data={hourlyEarnings}
                title="Today's Hourly Earnings"
              />
            )} */}
          </div>
        </div>
      )}

      {/* No Driver Selected */}
      {!selectedDriverId && drivers.length > 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: 48, 
          color: '#6b7280' 
        }}>
          Please select a driver to view statistics
        </div>
      )}

      {/* No Drivers Available */}
      {drivers.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: 48, 
          color: '#6b7280' 
        }}>
          No drivers available
        </div>
      )}
    </div>
  );
};

export default StatisticsScreen;