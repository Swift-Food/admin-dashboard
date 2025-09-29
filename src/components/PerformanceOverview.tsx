import React from 'react';
import type { Driver } from '../types/driver.types';
import type { DriverPerformanceStats } from '../services/driverAnalytics.service';

interface PerformanceOverviewProps {
  driver: Driver;
  stats: DriverPerformanceStats | null | undefined;
}

const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ driver, stats }) => {
  if (!driver) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 12, 
        padding: 24, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <p style={{ color: '#ef4444', fontSize: 16 }}>❌ Driver data not available</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: 12, 
        padding: 24, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Performance Overview
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0 0' }}>
            {driver.user?.username || 'Unknown Driver'} • Driver ID: {driver.id?.slice(0, 8) || 'N/A'}
          </p>
        </div>
        <div style={{ padding: 40, color: '#6b7280' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 16, margin: 0 }}>No performance data available</p>
        </div>
      </div>
    );
  }

  // Helper functions with correct API data handling
  const safeNumber = (value: number | null | undefined, defaultValue = 0): number => {
    if (value === null || value === undefined || isNaN(value)) {
      return defaultValue;
    }
    return Number(value);
  };

  // For API data that's already a percentage (87.5 = 87.5%)
  const safePercentage = (value: number | null | undefined): string => {
    const num = safeNumber(value, 0);
    return `${num.toFixed(1)}%`;
  };

  // Map API response to our display values
  const totalDeliveries = safeNumber(stats.totalDeliveries);
  const totalEarnings = safeNumber(stats.totalEarnings);
  const onTimeRate = safeNumber(stats.onTimeRate); // Already a percentage from API
  const customerRating = safeNumber(stats.averageCustomerRating);
  const restaurantRating = safeNumber(stats.averageRestaurantRating);
  const totalDistance = safeNumber(stats.totalDistance); // Note: API uses totalDistance, not totalDistanceKm
  const completionRate = safeNumber(stats.completionRate, 0);
  const avgDeliveryTime = safeNumber(stats.averageDeliveryTime, 0);

  const statCards = [
    {
      title: 'Total Deliveries',
      value: totalDeliveries.toString(),
      icon: '📦',
      color: '#3b82f6'
    },
    {
      title: 'Total Earnings',
      value: `£${totalEarnings.toFixed(2)}`,
      icon: '💰',
      color: '#10b981'
    },
    {
      title: 'On-Time Rate',
      value: safePercentage(onTimeRate),
      icon: '⏰',
      color: onTimeRate >= 80 ? '#10b981' : onTimeRate >= 60 ? '#f59e0b' : '#ef4444'
    },
    {
      title: 'Customer Rating',
      value: customerRating > 0 ? `${customerRating.toFixed(1)} ⭐` : 'No ratings yet',
      icon: '👥',
      color: customerRating > 0 ? '#8b5cf6' : '#6b7280'
    },
    {
      title: 'Distance Covered',
      value: `${totalDistance.toFixed(1)} km`,
      icon: '🛣️',
      color: '#06b6d4'
    }
  ];

  // Only add these if they exist in the API response
  if (restaurantRating > 0) {
    statCards.push({
      title: 'Restaurant Rating',
      value: `${restaurantRating.toFixed(1)} ⭐`,
      icon: '🏪',
      color: '#84cc16'
    });
  }

  if (completionRate > 0) {
    statCards.push({
      title: 'Completion Rate',
      value: safePercentage(completionRate),
      icon: '✅',
      color: '#f97316'
    });
  }

  if (avgDeliveryTime > 0) {
    statCards.push({
      title: 'Avg Delivery Time',
      value: `${avgDeliveryTime.toFixed(0)} min`,
      icon: '⏱️',
      color: '#e11d48'
    });
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: 12, 
      padding: 24, 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
          Performance Overview
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0 0' }}>
          {driver.user?.username || 'Unknown Driver'} • Driver ID: {driver.id?.slice(0, 8) || 'N/A'}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16 
      }}>
        {statCards.map((stat, index) => (
          <div
            key={index}
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div style={{
              fontSize: 24,
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: stat.color + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {stat.icon}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                color: stat.color 
              }}>
                {stat.value}
              </div>
              <div style={{ 
                fontSize: 12, 
                color: '#6b7280', 
                fontWeight: '500' 
              }}>
                {stat.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceOverview;