import http from "./http";

import type { CreateAddressDto } from "../types/address.types";

const createAddress = async (
  dto: CreateAddressDto
): Promise<{ id: string }> => {
  const res = await http.post<{ id: string }>("/address", dto);
  return res.data;
};

export { createAddress };
