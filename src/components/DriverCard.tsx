import React from 'react';
import type {Driver} from '../types/driver.types'; // Use the shared Driver type

interface DriverCardProps {
    driver: Driver;
}

const getStatusColour = (status: string) => {
  switch (status) {
    case 'occupied':
      return '#008000';
    case 'unavailable':
      return '#a11806';
    case 'available':
      return '#4d4afb';
  }
};

const DriverCard: React.FC<DriverCardProps> = ({ driver }) => (
  <div
    className="driver-card"
    style={{
      backgroundColor: getStatusColour(driver.status),
    }}
  >
    <p className="driver-card__id">
      Driver #{driver.id}
    </p>
    <p className="driver-card__username">
      {driver.user?.username ?? 'N/A'}
    </p>
    <p className="driver-card__status">
      {driver.status}
    </p>
  </div>
);

export default DriverCard;
