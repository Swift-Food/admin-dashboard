import http from "./http";
import type {
  EventLocation,
  CreateEventLocationDto,
  UpdateEventLocationDto,
} from "../types/event-location.types";

export const getAllLocations = async (): Promise<EventLocation[]> => {
  const res = await http.get<EventLocation[]>("/events/admin/locations");
  return res.data;
};

export const getLocation = async (id: string): Promise<EventLocation> => {
  const res = await http.get<EventLocation>(`/events/admin/locations/${id}`);
  return res.data;
};

export const createLocation = async (
  data: CreateEventLocationDto
): Promise<EventLocation> => {
  const res = await http.post<EventLocation>("/events/admin/locations", data);
  return res.data;
};

export const updateLocation = async (
  id: string,
  data: UpdateEventLocationDto
): Promise<EventLocation> => {
  const res = await http.patch<EventLocation>(
    `/events/admin/locations/${id}`,
    data
  );
  return res.data;
};

export const deleteLocation = async (id: string): Promise<void> => {
  await http.delete(`/events/admin/locations/${id}`);
};

export default {
  getAllLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
};
