import http from "./http";
import type {
  Restaurant,
  UpdateAvailabilityDto,
} from "../types/restaurant.types";

// ============================================
// TYPE DEFINITIONS FOR API RESPONSES
// ============================================

type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "driver_assigned"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface RestaurantUser {
  id: string;
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  role: string;
  verified: boolean;
  profilePicture?: string;
  adminOtp?: string;
}

interface Address {
  id: string;
  userId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipcode: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
  statsToMarkets: Array<{
    marketId: string;
    distance: number;
    time: number;
  }>;
}

interface Market {
  id: string;
  market_name: string;
  market_description?: string;
  address: Address;
  addressId: string;
  openingHours: Array<{
    day: string;
    open: string | null;
    close: string | null;
  }>;
  images?: string[];
  averageRating: number;
  isOpen: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable: boolean;
}

interface RestaurantResponse {
  id: string;
  restaurant_name: string;
  isOpen: boolean;
  restaurant_description?: string;
  restaurantType: "restaurant" | "stall";
  featured: boolean;
  phoneNumber?: string;
  email?: string;
  averageRating?: number;
  commission?: number;
  restaurantNumber?: string;
  fsa?: number;
  fsaLink?: string;
  autoAccept?: boolean;
  owner?: RestaurantUser;
  menuItems?: MenuItem[];
  address?: Address;
  market?: Market;
  marketId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RestaurantOrdersResponse {
  [orderId: string]: OrderStatus;
}

// ============================================
// READ OPERATIONS
// ============================================

const getAllRestaurants = async (): Promise<RestaurantResponse[]> => {
  const res = await http.get<RestaurantResponse[]>("/restaurant");
  console.log("Restaurants:", res);
  return res.data;
};

const getAllRestaurantsWithMarket = async (): Promise<RestaurantResponse[]> => {
  const res = await http.get<RestaurantResponse[]>("/restaurant/withMarkets");
  return res.data;
};

const getRestaurantById = async (
  id: string
): Promise<RestaurantResponse | null> => {
  const res = await http.get<RestaurantResponse>(`/restaurant/${id}`);
  return res.data;
};

const getRestaurantOrders = async (
  restaurantId: string
): Promise<RestaurantOrdersResponse> => {
  const res = await http.get<RestaurantOrdersResponse>(
    `/restaurant/getOrders/${restaurantId}`
  );
  return res.data;
};

// ============================================
// UPDATE OPERATIONS
// ============================================

const updateRestaurantAvailability = async (
  id: string,
  updateDto: UpdateAvailabilityDto
): Promise<RestaurantResponse> => {
  const res = await http.patch<RestaurantResponse>(
    `/restaurant/${id}/availability`,
    updateDto
  );
  console.log("Updated Restaurant:", res);
  return res.data;
};

const toggleRestaurantStatus = async (
  id: string,
  isOpen: boolean
): Promise<RestaurantResponse> => {
  return updateRestaurantAvailability(id, {
    isOpen,
    deviceToken: null,
  });
};

// ============================================
// CREATE OPERATIONS - TYPE DEFINITIONS
// ============================================

interface CreateRestaurantUserDto {
  userDetails: {
    username: string;
    password: string;
    email: string;
    phoneNumber: string;
    role: "restaurant_owner";
    verified: boolean;
    profilePicture?: string;
  };
  bankingInformation: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
  };
  rating: number;
}

interface CreateAddressDto {
  userId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipcode: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface CreateRestaurantDto {
  restaurant_name: string;
  isOpen: boolean;
  restaurant_description: string;
  restaurantType: "restaurant" | "stall";
  featured: boolean;
  addressId: string;
  phoneNumber: string;
  email: string;
  openingHours: Array<{
    day: string;
    open: string;
    close: string;
  }>;
  images: string[];
  ownerId: string;
  marketId: string;
  restaurantNumber?: string;
  fsa?: number;
  fsaLink?: string;
  autoAccept?: boolean;
}

interface CreateCompleteRestaurantDto {
  // User details
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  profilePicture?: string;

  // Address details
  addressName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipcode: string;
  latitude: number;
  longitude: number;

  // Restaurant details
  restaurant_name: string;
  restaurant_description: string;
  restaurantType: "restaurant" | "stall";
  featured: boolean;
  openingHours: Array<{ day: string; open: string; close: string }>;
  images: string[];
  marketId: string;
  restaurantNumber?: string;
  fsa?: number;
  fsaLink?: string;
  autoAccept?: boolean;
}

// ============================================
// CREATE OPERATIONS - API CALLS
// ============================================

const createRestaurantUser = async (
  dto: CreateRestaurantUserDto
): Promise<{ id: string }> => {
  const res = await http.post<{ id: string }>("/restaurant-user", dto);
  return res.data;
};

const createAddress = async (
  dto: CreateAddressDto
): Promise<{ id: string }> => {
  const res = await http.post<{ id: string }>("/address", dto);
  return res.data;
};

const createRestaurant = async (
  dto: CreateRestaurantDto
): Promise<RestaurantResponse> => {
  const res = await http.post<RestaurantResponse>("/restaurant", dto);
  return res.data;
};

// ============================================
// COMPLETE RESTAURANT CREATION
// ============================================

/**
 * Creates a complete restaurant with all required dependencies:
 * 1. Restaurant User (owner account)
 * 2. Address
 * 3. Restaurant
 *
 * This helper function orchestrates all three API calls in the correct order.
 */
const createCompleteRestaurant = async (
  data: CreateCompleteRestaurantDto
): Promise<RestaurantResponse> => {
  // Step 1: Create Restaurant User
  const userResult = await createRestaurantUser({
    userDetails: {
      username: data.username,
      password: data.password,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: "restaurant_owner",
      verified: true,
      profilePicture: data.profilePicture,
    },
    bankingInformation: {
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      routingNumber: data.routingNumber,
    },
    rating: 5.0,
  });

  // Step 2: Create Address
  const addressResult = await createAddress({
    userId: userResult.id,
    name: data.addressName,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2,
    city: data.city,
    zipcode: data.zipcode,
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });

  // Step 3: Create Restaurant
  const restaurant = await createRestaurant({
    restaurant_name: data.restaurant_name,
    isOpen: true,
    restaurant_description: data.restaurant_description,
    restaurantType: data.restaurantType,
    featured: data.featured,
    addressId: addressResult.id,
    phoneNumber: data.phoneNumber,
    email: data.email,
    openingHours: data.openingHours,
    images: data.images,
    ownerId: userResult.id,
    marketId: data.marketId,
    restaurantNumber: data.restaurantNumber,
    fsa: data.fsa,
    fsaLink: data.fsaLink,
    autoAccept: data.autoAccept ?? true,
  });

  return restaurant;
};

// ============================================
// EXPORTS
// ============================================

export {
  // Read operations
  getAllRestaurants,
  getAllRestaurantsWithMarket,
  getRestaurantById,
  getRestaurantOrders,
  // Update operations
  updateRestaurantAvailability,
  toggleRestaurantStatus,
  // Create operations
  createRestaurantUser,
  createAddress,
  createRestaurant,
  createCompleteRestaurant,
};

export type {
  Restaurant,
  UpdateAvailabilityDto,
  CreateRestaurantUserDto,
  CreateAddressDto,
  CreateRestaurantDto,
  CreateCompleteRestaurantDto,
  RestaurantResponse,
  RestaurantUser,
  Address,
  Market,
  MenuItem,
  OrderStatus,
  RestaurantOrdersResponse,
};
