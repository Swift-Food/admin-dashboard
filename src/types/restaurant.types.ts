import type { Order } from "./order.types";
import type { Address } from "./address.types";
import type { Market } from "./market.types";
import type { RestaurantUser } from "./user.types";

export interface OpeningHours {
  day: string;
  open: string | null;
  close: string | null;
}

export interface MenuGroupSettings {
  [groupTitle: string]: {
    displayOrder: number;
    isVisible: boolean;
  };
}

export interface HappyHour {
  discount: number;
  freeDrink: boolean;
  durationMinutes: number;
  startTime?: Date;
  endTime?: Date;
}
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  restaurantId: string;
}
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
}

export interface Restaurant {
  id: string;
  restaurant_name: string;
  restaurant_description: string | null;
  commission: number;
  address?: Address;
  addressId: string;
  phoneNumber: string | null;

  email: string | null;
  featured: boolean;
  openingHours: OpeningHours[];
  images: string[];
  eventImages?: string[];
  isCatering?: boolean;
  averageRating: number;
  status: 'active' | 'inactive' | 'coming_soon';
  owner?: RestaurantUser;
  menuItems?: MenuItem[];
  menuGroupSettings: MenuGroupSettings | null;
  createdAt: Date;
  updatedAt: Date;
  market?: Market;
  marketId: string;
  orders?: Order[];
  restaurantNumber: string | null;
  orderItems: OrderItem[] | null;
  deviceToken: string | null;
  happyHour: HappyHour | null;
  isHappyHour: boolean | null;
  activePromotionsCount: number;
  maxDiscountAmount: number;
  maxDiscountPercentage: number;
  fsa: number;
  fsaLink: string | null;
}

export interface UpdateAvailabilityDto {
  status: string;
  deviceToken: string | null;
}

export interface UpdateRestaurantDto {
  restaurant_name?: string;
  restaurant_description?: string;
  commission?: number;
  featured?: boolean;
  isCatering?: boolean;
  fsa?: number;
  fsaLink?: string;
  autoAccept?: boolean;
  restaurantNumber?: string;
  phoneNumber?: string;
  email?: string;
  status?: "active" | "inactive" | "coming_soon";
  images?: string;
}
