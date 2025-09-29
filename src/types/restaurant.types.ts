
  
  export interface OpeningHours {
    day: string;
    open: string | null;
    close: string | null;
  }
  
  export interface MenuGroupSettings {
    [groupTitle: string]: {
      displayOrder: number;
      isVisible: boolean;
    }
  }
  
  export interface HappyHour {
    discount: number;
    freeDrink: boolean;
    durationMinutes: number;
    startTime?: Date;
    endTime?: Date;
  }
  
  export interface Address {
    id: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }
  
  export interface Market {
    id: string;
    name: string;
    description?: string;
  }
  
  export interface RestaurantUser {
    id: string;
    username: string;
    password: string;
    adminOtp: string;
    email?: string;
    phoneNumber?: string;
    restaurantId: string;
  }
  
  export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    restaurantId: string;
  }
  
  export interface Order {
    id: string;
    restaurantId: string;
    status: string;
    total: number;
    createdAt: Date;
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
    averageRating: number;
    isOpen: boolean;
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
    isOpen: boolean;
    deviceToken: string | null;
  }