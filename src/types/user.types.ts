import type { Restaurant } from "./restaurant.types";
import type { Order } from "./order.types";

export type UserRole = "customer" | "restaurant_owner" | "driver" | "admin";

export type DriverStatus = "available" | "unavailable" | "occupied";

export interface LocationDto {
  latitude: number;
  longitude: number;
}

interface CreateRestaurantUserDto {
  userDetails: {
    username: string;
    password: string;
    email: string;
    phoneNumber?: string;
    role?: string;
    verified?: boolean;
    profilePicture?: string;
    isGoogleUser?: boolean;
    googleId?: string;
  };
  bankingInformation?: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
  };
  restaurant?: Restaurant;
  rating: number;
  adminOtp?: string;
}

interface RestaurantUser {
  id: string;
  user: {
    id: string;
    email: string;
    username: string;
    phoneNumber?: string;
    verified: boolean;
    profilePicture?: string;
    isGoogleUser?: boolean;
    googleId?: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    tokens?: string;
  };
  restaurant: string | null;
  bankingInformation: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
  };
  rating: number;
  adminOtp?: string;
}

interface CreateRestaurantUserResponse {
  id: string; // RestaurantUser ID
  user: {
    id: string;
    email: string;
    username: string;
    phoneNumber?: string;
    verified: boolean;
    profilePicture?: string;
    isGoogleUser?: boolean;
    googleId?: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    tokens?: string;
  };
  restaurant: string | null;
  bankingInformation?: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
  };
  rating: number;
  adminOtp?: string;
}

interface User {
  id: string;
  verified: boolean;
  email: string;
  phoneNumber?: string;
  username: string;
  password: string;
  profilePicture?: string;
  isGoogleUser: boolean;
  googleId?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  tokens?: string;
  restaurantUser?: RestaurantUser;
}

interface DriverUser {
  id: string;
  user: User;
  status: DriverStatus;
  currentLocation?: LocationDto;
  rating: number;
  points: number;
  activeOrder?: Order[];
  completedOrders?: string[];
  failedOrders?: string[];
  deviceToken: string;
  paymentMethods?: Array<{
    id: string;
    type: "bank_account";
    isDefault: boolean;
    accountNumber?: string;
    bankName?: string;
    bankcode?: string;
    accountHolderName?: string;
    address?: {
      address1: string;
      city: string;
      postalCode: string;
      countryCode: string;
    };
  }>;
  availableBalance: number;
  lastPayoutDate?: string;
}

export type {
  User,
  DriverUser,
  RestaurantUser,
  CreateRestaurantUserDto,
  CreateRestaurantUserResponse,
};
