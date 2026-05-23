import http from "../services/http";

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

const createAddress = async (
  dto: CreateAddressDto
): Promise<{ id: string }> => {
  const res = await http.post<{ id: string }>("/address", dto);
  return res.data;
};

interface UpdateAddressDto {
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  zipcode?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export type { Address, CreateAddressDto, UpdateAddressDto };
export { createAddress };
