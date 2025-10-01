import http from "./http";
import type { Market } from "../types/market.types";

const getAllMarkets = async (): Promise<Market[]> => {
  const res = await http.get<Market[]>("/market");
  return res.data;
};

export { getAllMarkets };
