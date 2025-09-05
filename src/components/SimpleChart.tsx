import React from 'react';
import type { DailyStats } from '../services/driverAnalytics.service';

interface DailyChartProps {
  data: DailyStats[];
  title: string;
}

const DailyChart: React.FC<DailyChartProps> = ({ data, title }) => {
  const maxEarnings = Math.max(...data.map(d => d.earnings));
  const maxDeliveries = Math.max(...data.map(d => d.deliveries));

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: 12, 
      padding: 24, 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>
        {title}
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, minWidth: '600px', alignItems: 'end', height: 200 }}>
          {data.map((day, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              {/* Earnings Bar */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px 4px 0 0',
                  height: `${(day.earnings / maxEarnings) * 120}px`,
                  minHeight: '2px',
                  position: 'relative'
                }}
                title={`Earnings: £${day.earnings.toFixed(2)}`}
              />
              
              {/* Deliveries Bar */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#10b981',
                  borderRadius: '0 0 4px 4px',
                  height: `${(day.deliveries / maxDeliveries) * 60}px`,
                  minHeight: '2px'
                }}
                title={`Deliveries: ${day.deliveries}`}
              />
              
              {/* Date Label */}
              <div style={{ 
                fontSize: 10, 
                color: '#6b7280', 
                transform: 'rotate(-45deg)',
                whiteSpace: 'nowrap'
              }}>
                {new Date(day.date).toLocaleDateString('en-GB', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#3b82f6', borderRadius: 2 }} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>Earnings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#10b981', borderRadius: 2 }} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>Deliveries</span>
        </div>
      </div>
    </div>
  );
};

export default DailyChart;