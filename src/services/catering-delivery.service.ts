import http from "./http";
import type {
  AdminDeliverySession,
  BookableProvider,
  CateringDeliveryBooking,
  CateringMealSession,
  CourierProviderInfo,
  DeliveryPricePreview,
  GetAllSessionsParams,
  PackageCounts,
} from "../types/catering-session.types";

/**
 * Courier bookings for catering meal sessions.
 * Base path: /catering-delivery/admin
 */

const getSessions = async (
  params?: GetAllSessionsParams
): Promise<AdminDeliverySession[]> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.startDate) queryParams.append("startDate", params.startDate);
  if (params?.endDate) queryParams.append("endDate", params.endDate);
  const qs = queryParams.toString();
  const res = await http.get<AdminDeliverySession[]>(
    qs ? `catering-delivery/admin/sessions?${qs}` : "catering-delivery/admin/sessions"
  );
  return res.data;
};

/** Courier companies we can book with, and whether their credentials are set up. */
const getProviders = async (): Promise<CourierProviderInfo[]> => {
  const res = await http.get<CourierProviderInfo[]>("catering-delivery/admin/providers");
  return res.data;
};

const bookCourier = async (
  mealSessionId: string,
  body: {
    packages: PackageCounts;
    pickupNotes?: string;
    dropNotes?: string;
    pickupRestaurantId?: string;
    provider?: BookableProvider;
  }
): Promise<CateringDeliveryBooking> => {
  const res = await http.post<CateringDeliveryBooking>(
    `catering-delivery/admin/sessions/${mealSessionId}/book`,
    body
  );
  return res.data;
};

/**
 * Live quote. `isExpress` overrides the service level derived from the
 * session's collection→delivery window (used to show the same-day price for
 * an express session); the booking itself always uses the real window.
 */
const getPricePreview = async (
  mealSessionId: string,
  packages: PackageCounts,
  pickupRestaurantId?: string,
  provider?: BookableProvider,
  isExpress?: boolean
): Promise<DeliveryPricePreview> => {
  const res = await http.post<DeliveryPricePreview>(
    `catering-delivery/admin/sessions/${mealSessionId}/price`,
    { packages, pickupRestaurantId, provider, ...(isExpress === undefined ? {} : { isExpress }) }
  );
  return res.data;
};

const cancelBooking = async (
  bookingId: string,
  cancelReason?: string
): Promise<CateringDeliveryBooking> => {
  const res = await http.post<CateringDeliveryBooking>(
    `catering-delivery/admin/bookings/${bookingId}/cancel`,
    { cancelReason }
  );
  return res.data;
};

const getRiderLocation = async (
  bookingId: string
): Promise<{ location: [number, number] }> => {
  const res = await http.get<{ location: [number, number] }>(
    `catering-delivery/admin/bookings/${bookingId}/rider-location`
  );
  return res.data;
};

/** One restaurant delivers its own part of the session; optionally pay it for that. */
const setRestaurantSelfDelivery = async (
  mealSessionId: string,
  restaurantId: string,
  body: { amount?: number; note?: string }
): Promise<CateringMealSession> => {
  const res = await http.post<CateringMealSession>(
    `catering-delivery/admin/sessions/${mealSessionId}/restaurants/${restaurantId}/self-delivery`,
    body
  );
  return res.data;
};

const revertRestaurantToCourier = async (
  mealSessionId: string,
  restaurantId: string
): Promise<CateringMealSession> => {
  const res = await http.post<CateringMealSession>(
    `catering-delivery/admin/sessions/${mealSessionId}/restaurants/${restaurantId}/courier`
  );
  return res.data;
};

/** Self-delivery sessions have no courier webhook, so an admin confirms delivery. */
const markDelivered = async (mealSessionId: string): Promise<CateringMealSession> => {
  const res = await http.post<CateringMealSession>(
    `catering-delivery/admin/sessions/${mealSessionId}/mark-delivered`
  );
  return res.data;
};

export default {
  getSessions,
  getProviders,
  bookCourier,
  getPricePreview,
  cancelBooking,
  getRiderLocation,
  setRestaurantSelfDelivery,
  revertRestaurantToCourier,
  markDelivered,
};
