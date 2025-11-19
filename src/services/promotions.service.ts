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

export const startSwiftHour = async (
  restaurantId: string,
  durationMinutes: number,
  discount: number,
  isHappyHour: boolean,
  freeDrink: boolean
): Promise<{ message: string }> => {
  const res = await http.post<{ message: string }>(`/promotions/${restaurantId}/swift-hour/start`, {
    durationMinutes,
    discount,
    isHappyHour,
    freeDrink,
  });
  return res.data;
};

export const endSwiftHour = async (
  restaurantId: string
): Promise<{ message: string }> => {
  const res = await http.post<{ message: string }>(`/promotions/${restaurantId}/swift-hour/end`);
  return res.data;
};

export const setHappyHour = async (
  restaurantId: string,
  happyHour: HappyHour
): Promise<SetHappyHourResponse> => {
  const res = await http.post<SetHappyHourResponse>(
    `/promotions/restaurant/happyhour/${restaurantId}`,
    happyHour
  );
  return res.data;
};

export const getHappyHour = async (
  restaurantId: string
): Promise<GetHappyHourResponse> => {
  const res = await http.get<GetHappyHourResponse>(`/promotions/restaurant/happyhour/${restaurantId}`);
  return res.data;
};

export const getHappyHourTimeRemaining = async (
  restaurantId: string
): Promise<HappyHourTimeRemainingResponse> => {
  const res = await http.get<HappyHourTimeRemainingResponse>(
    `/promotions/restaurant/happyhour/${restaurantId}/time-remaining`
  );
  return res.data;
};
