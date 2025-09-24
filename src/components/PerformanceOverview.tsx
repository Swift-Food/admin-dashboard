import React from 'react';
import type { Driver } from '../types/driver.types';
import type { DriverPerformanceStats } from '../services/driverAnalytics.service';

interface PerformanceOverviewProps {
  driver: Driver;
  stats: DriverPerformanceStats | null | undefined;
}

const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ driver, stats }) => {
  // Add error boundary and null checks
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
          <p style={{ fontSize: 14, margin: '8px 0 0 0' }}>Statistics will appear here once the driver completes deliveries.</p>
        </div>
      </div>
    );
  }

  // Helper function to safely format numbers
  const safeNumber = (value: number | null | undefined, defaultValue = 0): number => {
    return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  };

  // Helper function to safely format percentages
  const safePercentage = (value: number | null | undefined): string => {
    const num = safeNumber(value);
    return `${(num * 100).toFixed(1)}%`;
  };

  // Create stat cards with safe data access
  const statCards = [
    {
      title: 'Total Deliveries',
      value: safeNumber(stats.totalDeliveries),
      icon: '📦',
      color: '#3b82f6'
    },
    {
      title: 'Total Earnings',
      value: `£${safeNumber(stats.totalEarnings).toFixed(2)}`,
      icon: '💰',
      color: '#10b981'
    },
    {
      title: 'On-Time Rate',
      value: safePercentage(stats.onTimeDeliveryRate),
      icon: '⏰',
      color: '#f59e0b'
    },
    {
      title: 'Customer Rating',
      value: `${safeNumber(stats.averageCustomerRating).toFixed(1)} ⭐`,
      icon: '👥',
      color: '#8b5cf6'
    },
    {
      title: 'Distance Covered',
      value: `${safeNumber(stats.totalDistanceKm).toFixed(1)} km`,
      icon: '🛣️',
      color: '#06b6d4'
    },
    {
      title: 'Completion Rate',
      value: safePercentage(stats.completionRate),
      icon: '✅',
      color: '#84cc16'
    }
  ];

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
          {driver.user?.username || 'Unknown Driver'} • Driver ID: {driver.id || 'N/A'}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
            
            <div>
              <div style={{ 
                fontSize: 24, 
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