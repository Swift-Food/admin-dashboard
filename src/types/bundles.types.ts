export interface CateringBundleItem {
  id?: string;
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  menuItemName: string;
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
  name: string;
  description?: string;
  imageUrl?: string;
  pricePerPerson: number;
  baseGuestCount: number;
  isActive: boolean;
  items: CateringBundleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCateringBundleDto {
  name: string;
  description?: string;
  imageUrl?: string;
  pricePerPerson: number;
  baseGuestCount: number;
  items: Omit<CateringBundleItem, 'id'>[];
}

export interface UpdateCateringBundleDto {
  name?: string;
  description?: string;
  imageUrl?: string;
  pricePerPerson?: number;
  baseGuestCount?: number;
  items?: Omit<CateringBundleItem, 'id'>[];
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
