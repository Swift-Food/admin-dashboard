import http from "./http";
import type {
  CateringBundle,
  CreateCateringBundleDto,
  UpdateCateringBundleDto,
} from "../types/bundles.types";

export const getAllBundles = async (): Promise<CateringBundle[]> => {
  const res = await http.get<CateringBundle[]>("/catering-bundles");
  return res.data;
};

export const getActiveBundles = async (): Promise<CateringBundle[]> => {
  const res = await http.get<CateringBundle[]>("/catering-bundles/active");
  return res.data;
};

export const getBundleById = async (id: string): Promise<CateringBundle> => {
  const res = await http.get<CateringBundle>(`/catering-bundles/${id}`);
  return res.data;
};

export const createBundle = async (
  data: CreateCateringBundleDto
): Promise<CateringBundle> => {
  console.log("data submitting is", JSON.stringify(data))
  const res = await http.post<CateringBundle>("/catering-bundles", data);
  return res.data;
};

export const updateBundle = async (
  id: string,
  data: UpdateCateringBundleDto
): Promise<CateringBundle> => {
  const res = await http.put<CateringBundle>(`/catering-bundles/${id}`, data);
  return res.data;
};

export const deleteBundle = async (id: string): Promise<void> => {
  await http.delete(`/catering-bundles/${id}`);
};

export const hardDeleteBundle = async (id: string): Promise<void> => {
  await http.delete(`/catering-bundles/${id}/hard`);
};
