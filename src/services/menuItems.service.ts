import http from "./http";
import type { CateringMenuItem } from "../types/bundles.types";

export const getCateringMenuItems = async (): Promise<CateringMenuItem[]> => {
  const res = await http.get<CateringMenuItem[]>("/menu-item/catering");
  return res.data;
};
