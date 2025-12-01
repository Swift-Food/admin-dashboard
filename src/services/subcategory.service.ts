import http from "./http";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Category {
  id: string;
  name: string;
  images?: string;
  selectedImage?: string;
  clicks: number;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  displayOrder: number;
  clicks: number;
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  groupTitle?: string;
  price: number;
  isAvailable: boolean;
  restaurantId: string;
}

export interface AddMenuItemsResponse {
  added: number;
  subcategory: Subcategory;
}

export interface RemoveMenuItemsResponse {
  removed: number;
  subcategory: Subcategory;
}

export interface MoveMenuItemsResponse {
  moved: number;
  fromSubcategory: Subcategory;
  toSubcategory: Subcategory;
}

// ============================================
// CATEGORY OPERATIONS
// ============================================

export const getAllCategories = async (): Promise<Category[]> => {
  const res = await http.get<Category[]>("/categories");
  return res.data;
};

export const getCategoryById = async (id: string): Promise<Category> => {
  const res = await http.get<Category>(`/categories/${id}`);
  return res.data;
};

// ============================================
// SUBCATEGORY OPERATIONS
// ============================================

export const getAllSubcategories = async (): Promise<Subcategory[]> => {
  const res = await http.get<Subcategory[]>("/subcategory");
  return res.data;
};

export const getSubcategoryById = async (id: string): Promise<Subcategory> => {
  const res = await http.get<Subcategory>(`/subcategory/${id}`);
  return res.data;
};

export const getSubcategoriesByCategory = async (categoryId: string): Promise<Subcategory[]> => {
  const res = await http.get<Subcategory[]>(`/subcategory/category/${categoryId}`);
  return res.data;
};

export const createSubcategory = async (data: {
  name: string;
  categoryId: string;
  displayOrder?: number;
}): Promise<Subcategory> => {
  const res = await http.post<Subcategory>("/subcategory", data);
  return res.data;
};

export const updateSubcategory = async (
  id: string,
  data: { name?: string; displayOrder?: number; menuItemIds?: string[] }
): Promise<Subcategory> => {
  const res = await http.patch<Subcategory>(`/subcategory/${id}`, data);
  return res.data;
};

export const deleteSubcategory = async (id: string): Promise<void> => {
  await http.delete(`/subcategory/${id}`);
};

// ============================================
// MENU ITEM MANAGEMENT
// ============================================

export const addMenuItemsByGroupTitle = async (
  subcategoryId: string,
  groupTitle: string,
  restaurantId?: string
): Promise<AddMenuItemsResponse> => {
  const res = await http.post<AddMenuItemsResponse>(
    `/subcategory/${subcategoryId}/menu-items/by-group-title`,
    { groupTitle, restaurantId }
  );
  return res.data;
};

export const addMenuItemsById = async (
  subcategoryId: string,
  menuItemIds: string[]
): Promise<AddMenuItemsResponse> => {
  const res = await http.post<AddMenuItemsResponse>(
    `/subcategory/${subcategoryId}/menu-items`,
    { menuItemIds }
  );
  return res.data;
};

export const removeMenuItems = async (
  subcategoryId: string,
  menuItemIds: string[]
): Promise<RemoveMenuItemsResponse> => {
  const res = await http.delete<RemoveMenuItemsResponse>(
    `/subcategory/${subcategoryId}/menu-items`,
    { data: { menuItemIds } }
  );
  return res.data;
};

export const getMenuItemCount = async (subcategoryId: string): Promise<number> => {
  const res = await http.get<number>(`/subcategory/${subcategoryId}/items/count`);
  return res.data;
};

export const moveMenuItems = async (
  fromSubcategoryId: string,
  toSubcategoryId: string,
  menuItemIds: string[]
): Promise<MoveMenuItemsResponse> => {
  const res = await http.post<MoveMenuItemsResponse>(
    `/subcategory/${fromSubcategoryId}/menu-items/move`,
    { toSubcategoryId, menuItemIds }
  );
  return res.data;
};

export const getAllGroupTitles = async (restaurantId?: string): Promise<string[]> => {
  const params = restaurantId ? `?restaurantId=${restaurantId}` : '';
  const res = await http.get<string[]>(`/menu-item/group-titles${params}`);
  return res.data;
};

export interface Restaurant {
  id: string;
  restaurant_name: string;
}

export const getAllRestaurants = async (): Promise<Restaurant[]> => {
  const res = await http.get<Restaurant[]>("/restaurant");
  return res.data;
};
