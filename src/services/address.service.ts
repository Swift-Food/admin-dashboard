import http from "./http";

import type { CreateAddressDto, UpdateAddressDto, Address } from "../types/address.types";

const createAddress = async (
  dto: CreateAddressDto
): Promise<{ id: string }> => {
  const res = await http.post<{ id: string }>("/address", dto);
  return res.data;
};

const updateAddress = async (
  id: string,
  dto: UpdateAddressDto
): Promise<Address> => {
  const res = await http.patch<Address>(`/address/${id}`, dto);
  return res.data;
};

export { createAddress, updateAddress };
