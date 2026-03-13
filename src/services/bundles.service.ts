import http from "./http";
import type {
  BundleType,
  CateringBundle,
  CreateCateringBundleDto,
  UpdateCateringBundleDto,
} from "../types/bundles.types";

// Image upload function
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("upload", file);

  const res = await http.post<string>("/image-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const getAllBundles = async (
  type?: BundleType
): Promise<CateringBundle[]> => {
  const params = type ? { type } : {};
  const res = await http.get<CateringBundle[]>("/catering-bundles", { params });
  return res.data;
};

export const getActiveBundles = async (
  type?: BundleType
): Promise<CateringBundle[]> => {
  const params = type ? { type } : {};
  const res = await http.get<CateringBundle[]>("/catering-bundles/active", {
    params,
  });
  return res.data;
};

export const getBundleById = async (id: string): Promise<CateringBundle> => {
  const res = await http.get<CateringBundle>(`/catering-bundles/${id}`);
  return res.data;
};

export const getBundlesByRestaurant = async (
  restaurantId: string
): Promise<CateringBundle[]> => {
  const res = await http.get<CateringBundle[]>(
    `/catering-bundles/restaurant/${restaurantId}`
  );
  return res.data;
};

export const createBundle = async (
  data: CreateCateringBundleDto
): Promise<CateringBundle> => {
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

export const toggleBundleActive = async (
  id: string
): Promise<CateringBundle> => {
  const res = await http.patch<CateringBundle>(
    `/catering-bundles/${id}/toggle-active`
  );
  return res.data;
};

export const getBundlesContainingMenuItem = async (
  menuItemId: string
): Promise<Array<{ id: string; name: string }>> => {
  const res = await http.get<Array<{ id: string; name: string }>>(
    `/catering-bundles/menu-item/${menuItemId}/bundles`
  );
  return res.data;
};
