import http from "./http";
import type {
  DriverMealSessionDto,
  DeliveryAnalyticsDto,
  AcceptMealSessionDto,
  UpdateDriverNameDto,
} from "../types/catering-driver.types";

class CateringDriverService {
  /** Get all meal sessions available for pickup (FINDING_DRIVER status) */
  async getAvailableSessions(): Promise<DriverMealSessionDto[]> {
    const response = await http.get<DriverMealSessionDto[]>(
      "/catering-driver/available-sessions"
    );
    return response.data;
  }

  /** Get all meal sessions currently assigned to drivers */
  async getAssignedSessions(): Promise<DriverMealSessionDto[]> {
    const response = await http.get<DriverMealSessionDto[]>(
      "/catering-driver/assigned-sessions"
    );
    return response.data;
  }

  /** Accept/assign a meal session with a driver name */
  async acceptMealSession(
    mealSessionId: string,
    dto: AcceptMealSessionDto
  ): Promise<DriverMealSessionDto> {
    const response = await http.post<DriverMealSessionDto>(
      `/catering-driver/accept/${mealSessionId}`,
      dto
    );
    return response.data;
  }

  /** Update the driver name(s) on an assigned meal session */
  async updateDriverName(
    mealSessionId: string,
    dto: UpdateDriverNameDto
  ): Promise<DriverMealSessionDto> {
    const response = await http.post<DriverMealSessionDto>(
      `/catering-driver/${mealSessionId}/update-driver-name`,
      dto
    );
    return response.data;
  }

  /** Get delivery analytics (pending, active, completed counts) */
  async getAnalytics(): Promise<DeliveryAnalyticsDto> {
    const response = await http.get<DeliveryAnalyticsDto>(
      "/catering-driver/analytics"
    );
    return response.data;
  }

  /** Get all driver names with active (non-delivered) orders */
  async getActiveDriverNames(): Promise<string[]> {
    const response = await http.get<string[]>(
      "/catering-driver/active-driver-names"
    );
    return response.data;
  }
}

export default new CateringDriverService();
