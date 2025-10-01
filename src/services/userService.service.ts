import http from "./http";
import type { User } from "../types/user.types";

export const getAllUsers = async (): Promise<User[]> => {
  const res = await http.get<User[]>("/user");
  return res.data;
};

export const getUserById = async (id: string) => {
  const res = await http.get(`/user/${id}`);
  return res.data;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const res = await http.get<User[]>(
      `/user?email=${encodeURIComponent(email)}`
    );
    return res.data[0] || null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
};
export const createUser = async (userData: Partial<User>): Promise<User> => {
  const res = await http.post<User>("/user", userData);
  return res.data;
};

export const updateUser = async (
  id: string,
  userData: Partial<User>
): Promise<User> => {
  const res = await http.put<User>(`/user/${id}`, userData);
  return res.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await http.delete(`/user/${id}`);
};

export const createRestaurantUser = async (
  userData: Partial<User>
): Promise<User> => {
  const res = await http.post<User>("/user", userData);
  return res.data;
};
