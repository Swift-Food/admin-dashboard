import http from "./http";
import type { CoworkingSpace, PaginatedSpacesResponse } from "../types/coworking.types";

const coworkingAdminService = {
  getSpaces: async (): Promise<CoworkingSpace[]> => {
    const { data } = await http.get<PaginatedSpacesResponse>("/admin/coworking?take=100");
    return data.items;
  },

  getSpace: async (id: string): Promise<CoworkingSpace> => {
    const { data } = await http.get<CoworkingSpace>(`/admin/coworking/${id}`);
    return data;
  },

  updateSpace: async (id: string, updates: Partial<Pick<CoworkingSpace, "isActive" | "name">>): Promise<CoworkingSpace> => {
    const { data } = await http.put<CoworkingSpace>(`/admin/coworking/${id}`, updates);
    return data;
  },

  resetStripe: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await http.post<{ success: boolean; message: string }>(`/admin/coworking/${id}/reset-stripe`);
    return data;
  },
};

export default coworkingAdminService;
