import http from "./http";
import type {
  Restaurant,
  UpdateAvailabilityDto,
  UpdateRestaurantDto,
} from "../types/restaurant.types";

import type { Market } from "../types/market.types";
import type { CreateAddressDto, Address } from "../types/address.types";
import type { OrderStatus } from "../types/order.types";
import type {
  RestaurantUser,
  CreateRestaurantUserDto,
} from "../types/user.types";

import { getUserByEmail } from "./userService.service";
// ============================================
// BASE TYPE DEFINITIONS
// ============================================

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

interface RestaurantResponse {
  id: string;
  restaurant_name: string;
  status: "active" | "inactive" | "coming_soon";
  restaurant_description?: string;
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
  images?: string[];
  showOnSite?: boolean;
  priceRange?: string;
  tags?: string[];
}

// CreateRestaurantDto
interface CreateRestaurantDto {
  restaurant_name: string;
  status?: string;
  restaurant_description?: string;
  featured?: boolean;
  addressId: string;
  phoneNumber?: string;
  email?: string;
  openingHours: Array<{ day: string; open: string; close: string }>;
  images?: string[];
  ownerId: string;
  marketId: string;
  restaurantNumber?: string;
  incomingOrder?: string;
  happyHour?: {
    discount: number;
    freeDrink: boolean;
    durationMinutes: number;
    startTime?: string;
    endTime?: string;
  };
  isHappyHour?: boolean;
  deviceToken?: string;
  fsa?: number;
  fsaLink?: string;
  autoAccept?: boolean;
  priceRange?: string;
  tags?: string[];
}

// RestaurantUser
interface RestaurantOrdersResponse {
  [orderId: string]: OrderStatus;
}

// ============================================
// API REQUEST DTOs
// ============================================

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
// READ OPERATIONS
// ============================================

const getAllRestaurants = async (): Promise<RestaurantResponse[]> => {
  const res = await http.get<RestaurantResponse[]>("/restaurant");
  console.log("Restaurants:", res);
  return res.data;
};

const getAllRestaurantsAdminDashboard = async (): Promise<
  RestaurantResponse[]
> => {
  const res = await http.get<RestaurantResponse[]>(
    "/restaurant/all-admin-dashboard"
  );
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
// IMAGE UPLOAD
// ============================================

const uploadRestaurantImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("upload", file);

  const res = await http.post<string>("/image-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
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

const updateRestaurantStatus = async (
  id: string,
  status: string
): Promise<RestaurantResponse> => {
  return updateRestaurantAvailability(id, {
    status,
    deviceToken: null,
  });
};

const updateRestaurant = async (
  id: string,
  updateDto: UpdateRestaurantDto
): Promise<RestaurantResponse> => {
  const res = await http.patch<RestaurantResponse>(`/restaurant/${id}`, updateDto);
  return res.data;
};

const deleteRestaurant = async (id: string): Promise<void> => {
  await http.delete(`/restaurant/${id}`);
};

// ============================================
// CREATE OPERATIONS
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

/**
 * Creates a complete restaurant with all required dependencies:
 * 1. Restaurant User (owner account) - or reuses existing if email matches
 * 2. Address
 * 3. Restaurant
 */
const createCompleteRestaurant = async (
  data: CreateCompleteRestaurantDto
): Promise<RestaurantResponse> => {
  let createdUserId: string | null = null;
  let createdAddressId: string | null = null;

  try {
    // Step 1: Try to find existing user by email, or create new one
    let userId: string;
    const existingUser = await getUserByEmail(data.email);

    if (existingUser) {
      console.log(`Found existing user with email: ${data.email}`);

      // Check if they already have a restaurantUser entity
      if (existingUser.restaurantUser?.id) {
        console.log(
          `Reusing existing restaurant user: ${existingUser.restaurantUser.id}`
        );
        userId = existingUser.restaurantUser.id;
        createdUserId = userId;
      } else {
        // User exists but doesn't have restaurantUser - need to create one
        // Generate unique username to avoid conflicts
        const uniqueUsername = `${data.username}_${Date.now()}`;
        console.log(
          `User exists but no restaurant user found, creating restaurant user with username: ${uniqueUsername}`
        );
        const userResult = await createRestaurantUser({
          userDetails: {
            username: uniqueUsername,
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
        userId = userResult.id;
        createdUserId = userId;
      }
    } else {
      // No existing user, create everything fresh
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
      userId = userResult.id;
      createdUserId = userId;
    }

    // Step 2: Create Address
    const addressResult = await createAddress({
      userId: userId,
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
    createdAddressId = addressResult.id;

    // Step 3: Create Restaurant
    const restaurant = await createRestaurant({
      restaurant_name: data.restaurant_name,
      status: 'inactive',
      restaurant_description: data.restaurant_description,
      featured: data.featured,
      addressId: addressResult.id,
      phoneNumber: data.phoneNumber,
      email: data.email,
      openingHours: data.openingHours,
      images: data.images,
      ownerId: userId,
      marketId: data.marketId,
      restaurantNumber: data.restaurantNumber,
      fsa: data.fsa,
      fsaLink: data.fsaLink,
      autoAccept: data.autoAccept ?? true,
    });

    return restaurant;
  } catch (error: any) {
    // Enhanced error handling with more context
    const errorMessage =
      error?.response?.data?.message || error?.message || "Unknown error";
    const statusCode = error?.response?.status;

    // Create a detailed error message
    let detailedError = `Failed to create restaurant: ${errorMessage}`;

    if (statusCode === 409) {
      // Check which step failed based on what was created
      if (!createdUserId) {
        detailedError = `Username "${data.username}" already exists. Please use a different username.`;
      } else if (!createdAddressId) {
        detailedError = `Address creation failed: ${errorMessage}`;
      } else {
        detailedError = `Restaurant creation failed: ${errorMessage}`;
      }
    }

    // Re-throw with enhanced message
    const enhancedError = new Error(detailedError);
    (enhancedError as any).originalError = error;
    (enhancedError as any).createdUserId = createdUserId;
    (enhancedError as any).createdAddressId = createdAddressId;
    throw enhancedError;
  }
};

// ============================================
// EXPORTS
// ============================================

export {
  // Read operations
  getAllRestaurants,
  getAllRestaurantsAdminDashboard,
  getRestaurantById,
  getRestaurantOrders,
  // Update operations
  updateRestaurantAvailability,
  updateRestaurantStatus,
  updateRestaurant,
  // Delete operations
  deleteRestaurant,
  // Create operations
  createRestaurantUser,
  createAddress,
  createRestaurant,
  createCompleteRestaurant,
  // Image upload
  uploadRestaurantImage,
};

export type {
  // Base types
  OrderStatus,
  RestaurantUser,
  Address,
  Market,
  MenuItem,
  // Response types
  Restaurant,
  RestaurantResponse,
  RestaurantOrdersResponse,
  // Request DTOs
  UpdateAvailabilityDto,
  UpdateRestaurantDto,
  CreateRestaurantUserDto,
  CreateAddressDto,
  CreateRestaurantDto,
  CreateCompleteRestaurantDto,
};
