import type { Address } from "./address.types";

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

export type { Market };
