import http from "./http";
import type { HappyHour } from "../types/restaurant.types";

export interface SetHappyHourResponse {
  success: boolean;
  message: string;
  data?: {
    restaurantId: string;
    happyHour: HappyHour;
  };
}

export interface GetHappyHourResponse {
  restaurantId: string;
  happyHour: HappyHour;
  isHappyHourActive: boolean;
}

export interface HappyHourTimeRemainingResponse {
  restaurantId: string;
  timeRemainingMinutes: number;
  isHappyHourActive: boolean;
}

// Start Swift Hour for a restaurant (manual trigger)
export const startSwiftHour = async (
  restaurantId: string,
  durationMinutes: number,
  discount: number,
  isHappyHour: boolean,
  freeDrink: boolean
): Promise<{ message: string }> => {
  return http.post(`/promotions/${restaurantId}/swift-hour/start`, {
    durationMinutes,
    discount,
    isHappyHour,
    freeDrink,
  });
};
// End Swift Hour for a restaurant (manual trigger)
export const endSwiftHour = async (
  restaurantId: string
): Promise<{ message: string }> => {
  return http.post(`/promotions/${restaurantId}/swift-hour/end`);
};

// Set Happy Hour (Swift Hour) for a restaurant
export const setHappyHour: (
  restaurantId: string,
  happyHour: HappyHour
) => Promise<SetHappyHourResponse> = async (
  restaurantId: string,
  happyHour: HappyHour
) => {
  return http.post(
    `/promotions/restaurant/happyhour/${restaurantId}`,
    happyHour
  );
};

// Get Happy Hour (Swift Hour) details for a restaurant
export const getHappyHour = async (
  restaurantId: string
): Promise<GetHappyHourResponse> => {
  return http.get(`/promotions/restaurant/happyhour/${restaurantId}`);
};

// Get Happy Hour (Swift Hour) time remaining for a restaurant
export const getHappyHourTimeRemaining = async (
  restaurantId: string
): Promise<HappyHourTimeRemainingResponse> => {
  return http.get(
    `/promotions/restaurant/happyhour/${restaurantId}/time-remaining`
  );
};
