import http from "./http";
import type {
  AdminCalendar,
  AdminCalendarSearchParams,
  AdminCalendarSearchResponse,
  AdminUpdateCalendarDto,
  CalendarStats,
} from "../types/calendar.types";

const BASE_PATH = "/calendars/admin/manage";

/**
 * Search and list calendars for admin
 */
const searchCalendars = async (
  params: AdminCalendarSearchParams = {}
): Promise<AdminCalendarSearchResponse> => {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append("search", params.search);
  if (params.type) queryParams.append("type", params.type);
  if (params.isPublic !== undefined) queryParams.append("isPublic", String(params.isPublic));
  if (params.skip !== undefined) queryParams.append("skip", params.skip.toString());
  if (params.take !== undefined) queryParams.append("take", params.take.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

  const res = await http.get<AdminCalendarSearchResponse>(url);
  return res.data;
};

/**
 * Get single calendar by ID
 */
const getCalendarById = async (id: string): Promise<AdminCalendar> => {
  const res = await http.get<AdminCalendar>(`${BASE_PATH}/${id}`);
  return res.data;
};

/**
 * Update a calendar
 */
const updateCalendar = async (
  id: string,
  dto: AdminUpdateCalendarDto
): Promise<{ success: boolean; message: string; calendar: AdminCalendar }> => {
  const res = await http.patch<{ success: boolean; message: string; calendar: AdminCalendar }>(
    `${BASE_PATH}/${id}`,
    dto
  );
  return res.data;
};

/**
 * Delete a calendar
 */
const deleteCalendar = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const res = await http.delete<{ success: boolean; message: string }>(
    `${BASE_PATH}/${id}`
  );
  return res.data;
};

/**
 * Get calendar statistics
 */
const getCalendarStats = async (): Promise<CalendarStats> => {
  const res = await http.get<CalendarStats>(`${BASE_PATH}/stats/summary`);
  return res.data;
};

const calendarService = {
  searchCalendars,
  getCalendarById,
  updateCalendar,
  deleteCalendar,
  getCalendarStats,
};

export default calendarService;
