import http from "./http";
import type {
  AdminEvent,
  AdminEventSearchParams,
  AdminEventSearchResponse,
  AdminUpdateEventDto,
  EventStats,
} from "../types/event.types";

const BASE_PATH = "/events/admin/manage";

/**
 * Search and list events for admin
 */
const searchEvents = async (
  params: AdminEventSearchParams = {}
): Promise<AdminEventSearchResponse> => {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status);
  if (params.skip !== undefined) queryParams.append("skip", params.skip.toString());
  if (params.take !== undefined) queryParams.append("take", params.take.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

  const res = await http.get<AdminEventSearchResponse>(url);
  return res.data;
};

/**
 * Get single event by ID
 */
const getEventById = async (id: string): Promise<AdminEvent> => {
  const res = await http.get<AdminEvent>(`${BASE_PATH}/${id}`);
  return res.data;
};

/**
 * Update an event
 */
const updateEvent = async (
  id: string,
  dto: AdminUpdateEventDto
): Promise<{ success: boolean; message: string; event: AdminEvent }> => {
  const res = await http.patch<{ success: boolean; message: string; event: AdminEvent }>(
    `${BASE_PATH}/${id}`,
    dto
  );
  return res.data;
};

/**
 * Delete an event
 */
const deleteEvent = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const res = await http.delete<{ success: boolean; message: string }>(
    `${BASE_PATH}/${id}`
  );
  return res.data;
};

/**
 * Get event statistics
 */
const getEventStats = async (): Promise<EventStats> => {
  const res = await http.get<EventStats>(`${BASE_PATH}/stats/summary`);
  return res.data;
};

const eventService = {
  searchEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventStats,
};

export default eventService;
