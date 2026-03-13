export type BundleType = 'prismo' | 'catering';

export interface CateringBundleItem {
  id?: string;
  cateringBundleId?: string;
  menuItemId: string;
  menuItemName: string;
  menuItemImageUrl?: string;
  menuItemPrice: number;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
  selectedAddons?: Array<{
    addonId: string;
    name: string;
    quantity: number;
  }>;
  sortOrder: number;
}

export interface CateringBundle {
  id: string;
  type: BundleType;
  name: string;
  description?: string;
  imageUrl?: string;
  pricePerPerson?: number;
  baseGuestCount?: number;
  isActive: boolean;
  restaurantId?: string;
  restaurantName?: string;
  items: CateringBundleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCateringBundleDto {
  type: BundleType;
  name: string;
  description?: string;
  imageUrl?: string;
  pricePerPerson?: number;
  baseGuestCount?: number;
  restaurantId?: string;
  items: CreateCateringBundleItemDto[];
}

export interface CreateCateringBundleItemDto {
  menuItemId: string;
  quantity: number;
  selectedAddons?: Array<{
    addonId: string;
    name: string;
    quantity: number;
  }>;
  sortOrder?: number;
}

export interface UpdateCateringBundleDto {
  name?: string;
  description?: string;
  imageUrl?: string;
  pricePerPerson?: number;
  baseGuestCount?: number;
  restaurantId?: string;
  items?: CreateCateringBundleItemDto[];
}

export interface CateringMenuItem {
  id: string;
  name: string;
  price: string | number;
  groupTitle: string;
  restaurant: {
    id: string;
    restaurant_name: string;
  };
  description?: string;
  image?: string;
  addons?: Array<{
    name: string;
    price: number;
    allergens?: string[];
    groupTitle: string;
    selectionType: string;
    isRequired: boolean;
  }>;
}
