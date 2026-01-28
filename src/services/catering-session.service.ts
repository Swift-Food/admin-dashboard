import http from "./http";
import type {
  CateringMealSession,
  CateringSessionTrackingDetails,
  CollectionRoute,
  GetAllSessionsParams,
} from "../types/catering-session.types";

/**
 * Service for catering driver / meal session delivery endpoints
 * Base path: /catering-driver
 */

const getAllSessions = async (
  params?: GetAllSessionsParams
): Promise<CateringMealSession[]> => {
  const queryParams = new URLSearchParams();

  if (params?.status) {
    queryParams.append("status", params.status);
  }
  if (params?.driverId) {
    queryParams.append("driverId", params.driverId);
  }
  if (params?.startDate) {
    queryParams.append("startDate", params.startDate);
  }
  if (params?.endDate) {
    queryParams.append("endDate", params.endDate);
  }

  const queryString = queryParams.toString();
  
  const url = queryString
    ? `catering-driver/admin/all-sessions?${queryString}`
    : "catering-driver/admin/all-sessions";

  const res = await http.get<CateringMealSession[]>(url);
  console.log("res data", JSON.stringify(res.data))
  return res.data;
};

const getTrackingDetails = async (
  mealSessionId: string
): Promise<CateringSessionTrackingDetails> => {
  const res = await http.get<CateringSessionTrackingDetails>(
    `catering-driver/track/${mealSessionId}`
  );
  return res.data;
};

const getCollectionRoute = async (
  mealSessionId: string
): Promise<CollectionRoute> => {
  const res = await http.get<CollectionRoute>(
    `catering-driver/${mealSessionId}/route`
  );
  return res.data;
};

export default {
  getAllSessions,
  getTrackingDetails,
  getCollectionRoute,
};
