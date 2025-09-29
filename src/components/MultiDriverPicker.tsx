import React from 'react';
import type { Driver } from '../types/driver.types';

interface MultiDriverPickerProps {
  drivers: Driver[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
}

const MultiDriverPicker: React.FC<MultiDriverPickerProps> = ({
  drivers,
  selectedIds,
  onChange,
  disabled = false
}) => {
  const handleDriverToggle = (driverId: string) => {
    if (selectedIds.includes(driverId)) {
      onChange(selectedIds.filter(id => id !== driverId));
    } else {
      onChange([...selectedIds, driverId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === drivers.length) {
      onChange([]);
    } else {
      onChange(drivers.map(d => d.id));
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>Select Drivers:</h3>
        <button
          onClick={handleSelectAll}
          disabled={disabled}
          style={{
            padding: '6px 12px',
            backgroundColor: selectedIds.length === drivers.length ? '#dc2626' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          {selectedIds.length === drivers.length ? 'Deselect All' : 'Select All'}
        </button>
        <span style={{ fontSize: 14, color: '#6b7280' }}>
          ({selectedIds.length} of {drivers.length} selected)
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 8,
        maxHeight: 200,
        overflowY: 'auto',
        border: '1px solid #d1d5db',
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
              backgroundColor: selectedIds.includes(driver.id) ? '#dbeafe' : 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 14
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(driver.id)}
              onChange={() => handleDriverToggle(driver.id)}
              disabled={disabled}
            />
            <span>
              {driver.user?.username || `Driver ${driver.id.slice(0, 8)}`}
            </span>
            <span style={{ 
              fontSize: 12, 
              color: '#6b7280',
              marginLeft: 'auto',
              textTransform: 'capitalize'
            }}>
              {driver.status}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default MultiDriverPicker;