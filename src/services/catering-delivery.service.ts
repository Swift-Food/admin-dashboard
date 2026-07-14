import http from "./http";
import type {
  AdminDeliverySession,
  CateringDeliveryBooking,
  DeliveryPricePreview,
  GetAllSessionsParams,
  PackageCounts,
} from "../types/catering-session.types";

/**
 * Pedivan courier bookings for catering meal sessions.
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

const bookCourier = async (
  mealSessionId: string,
  body: {
    packages: PackageCounts;
    pickupNotes?: string;
    dropNotes?: string;
    pickupRestaurantId?: string;
  }
): Promise<CateringDeliveryBooking> => {
  const res = await http.post<CateringDeliveryBooking>(
    `catering-delivery/admin/sessions/${mealSessionId}/book`,
    body
  );
  return res.data;
};

const getPricePreview = async (
  mealSessionId: string,
  packages: PackageCounts,
  pickupRestaurantId?: string
): Promise<DeliveryPricePreview> => {
  const res = await http.post<DeliveryPricePreview>(
    `catering-delivery/admin/sessions/${mealSessionId}/price`,
    { packages, pickupRestaurantId }
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

export default {
  getSessions,
  bookCourier,
  getPricePreview,
  cancelBooking,
  getRiderLocation,
};
