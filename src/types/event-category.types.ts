export interface EventSubcategory {
  id: string;
  name: string;
  categoryId: string;
  description: string | null;
  iconName: string | null;
  displayOrder: number;
}

export interface EventCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  iconName: string | null;
  eventCount: number;
  subcategories: EventSubcategory[];
}

export interface UpdateCategoryDto {
  description?: string;
  iconName?: string;
}

export interface CreateSubcategoryDto {
  name: string;
  categoryId: string;
  description?: string;
  iconName?: string;
  displayOrder?: number;
}

export interface UpdateSubcategoryDto {
  name?: string;
  description?: string;
  iconName?: string;
  displayOrder?: number;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}
