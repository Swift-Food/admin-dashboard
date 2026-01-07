import http from "./http";
import type {
  EventCategory,
  EventSubcategory,
  UpdateCategoryDto,
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
  DeleteResponse,
} from "../types/event-category.types";

// Categories
export const getAllCategories = async (): Promise<EventCategory[]> => {
  const res = await http.get<EventCategory[]>("/events/admin/categories");
  return res.data;
};

export const getCategory = async (id: string): Promise<EventCategory> => {
  const res = await http.get<EventCategory>(`/events/admin/categories/${id}`);
  return res.data;
};

export const updateCategory = async (
  id: string,
  data: UpdateCategoryDto
): Promise<EventCategory> => {
  const res = await http.patch<EventCategory>(
    `/events/admin/categories/${id}`,
    data
  );
  return res.data;
};

// Subcategories
export const createSubcategory = async (
  data: CreateSubcategoryDto
): Promise<EventSubcategory> => {
  const res = await http.post<EventSubcategory>(
    "/events/admin/subcategories",
    data
  );
  return res.data;
};

export const updateSubcategory = async (
  id: string,
  data: UpdateSubcategoryDto
): Promise<EventSubcategory> => {
  const res = await http.patch<EventSubcategory>(
    `/events/admin/subcategories/${id}`,
    data
  );
  return res.data;
};

export const deleteSubcategory = async (id: string): Promise<DeleteResponse> => {
  const res = await http.delete<DeleteResponse>(
    `/events/admin/subcategories/${id}`
  );
  return res.data;
};

export const reorderSubcategories = async (
  categoryId: string,
  subcategoryIds: string[]
): Promise<EventSubcategory[]> => {
  const res = await http.patch<EventSubcategory[]>(
    `/events/admin/categories/${categoryId}/reorder-subcategories`,
    { subcategoryIds }
  );
  return res.data;
};

export default {
  getAllCategories,
  getCategory,
  updateCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  reorderSubcategories,
};
