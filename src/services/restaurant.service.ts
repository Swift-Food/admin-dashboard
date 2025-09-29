import http from "./http";
import type { Restaurant, UpdateAvailabilityDto } from "../types/restaurant.types";

const getAllRestaurants = async (): Promise<Restaurant[]> => {
    const res = await http.get<Restaurant[]>('/restaurant');
    console.log("Restaurants:", res);
    return res.data;
}

const getRestaurantById = async (id: string): Promise<Restaurant | null> => {
    const res = await http.get<Restaurant>(`/restaurant/${id}`);
    return res.data;
}

const updateRestaurantAvailability = async (
    id: string, 
    updateDto: UpdateAvailabilityDto
): Promise<Restaurant> => {
    const res = await http.patch<Restaurant>(
        `/restaurant/${id}/availability`,
        updateDto
    );
    console.log("Updated Restaurant:", res);
    return res.data;
}

const toggleRestaurantStatus = async (
    id: string, 
    isOpen: boolean
): Promise<Restaurant> => {
    return updateRestaurantAvailability(id, {
        isOpen,
        deviceToken: null
    });
}

export { 
    getAllRestaurants, 
    getRestaurantById, 
    updateRestaurantAvailability,
    toggleRestaurantStatus 
};
export type { Restaurant, UpdateAvailabilityDto };