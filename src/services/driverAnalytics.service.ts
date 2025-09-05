import http from "./http";

export interface DriverAnalytic {
  orderId: string;
  driverId: string;
  driverName: string;
  assignedTime: Date;
  pickupTime?: Date;
  deliveryTime?: Date;
  distanceKm?: number;
  deliveryStatus: string;
  onTimeDelivery?: boolean;
  driverEarnings: number;
  customerRating?: number;
  restaurantRating?: number;
  notes?: string;
  comments?: string;
}

export interface DriverPerformanceStats {
  totalDeliveries: number;
  totalEarnings: number;
  onTimeDeliveryRate: number;
  averageCustomerRating: number;
  averageRestaurantRating: number;
  totalDistanceKm: number;
  completionRate: number;
  averageDeliveryTime: number; // in minutes
}

export interface DailyStats {
  date: string;
  deliveries: number;
  earnings: number;
  onTimeRate: number;
  averageRating: number;
}

export interface HourlyEarnings {
  hour: number;
  earnings: number;
  deliveries: number;
}

class DriverAnalyticsService {
  // Get all analytics for a specific driver
  async getDriverAnalytics(driverId: string): Promise<DriverAnalytic[]> {
    const response = await http.get<DriverAnalytic[]>(`/driver-analytics/driver/${driverId}`);
    return response.data;
  }

  // Get performance stats for a driver
  async getDriverPerformanceStats(driverId: string): Promise<DriverPerformanceStats> {
    const response = await http.get<DriverPerformanceStats>(`/driver-analytics/driver/${driverId}/performance`);
    return response.data;
  }

  // Get daily stats for a driver
  async getDriverDailyStats(driverId: string, date: string): Promise<DailyStats> {
    const response = await http.get<DailyStats>(`/driver-analytics/driver/${driverId}/daily?date=${date}`);
    return response.data;
  }

  // Get date range stats for a driver
  async getDriverDateRangeStats(driverId: string, startDate: string, endDate: string): Promise<DailyStats[]> {
    const response = await http.get<DailyStats[]>(`/driver-analytics/driver/${driverId}/dateRange?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  }

  // Get hourly earnings for a driver
  async getDriverHourlyEarnings(driverId: string, date: string): Promise<HourlyEarnings[]> {
    const response = await http.get<HourlyEarnings[]>(`/driver-analytics/driver/${driverId}/hourly?date=${date}`);
    return response.data;
  }

  // Get analytics for all drivers (overview)
  async getAllDriversPerformance(): Promise<{ driverId: string; driverName: string; stats: DriverPerformanceStats }[]> {
    const response = await http.get<{ driverId: string; driverName: string; stats: DriverPerformanceStats }[]>('/driver-analytics/overview');
    return response.data;
  }
}

export default new DriverAnalyticsService();