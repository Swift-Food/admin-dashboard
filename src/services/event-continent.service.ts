import http from "./http";
import type {
  EventContinent,
  CreateEventContinentDto,
  UpdateEventContinentDto,
} from "../types/event-location.types";

export const getAllContinents = async (): Promise<EventContinent[]> => {
  const res = await http.get<EventContinent[]>("/events/admin/continents");
  return res.data;
};

export const getContinent = async (id: string): Promise<EventContinent> => {
  const res = await http.get<EventContinent>(`/events/admin/continents/${id}`);
  return res.data;
};

export const createContinent = async (
  data: CreateEventContinentDto
): Promise<EventContinent> => {
  const res = await http.post<EventContinent>("/events/admin/continents", data);
  return res.data;
};

export const updateContinent = async (
  id: string,
  data: UpdateEventContinentDto
): Promise<EventContinent> => {
  const res = await http.patch<EventContinent>(
    `/events/admin/continents/${id}`,
    data
  );
  return res.data;
};

export const deleteContinent = async (id: string): Promise<void> => {
  await http.delete(`/events/admin/continents/${id}`);
};

export default {
  getAllContinents,
  getContinent,
  createContinent,
  updateContinent,
  deleteContinent,
};
