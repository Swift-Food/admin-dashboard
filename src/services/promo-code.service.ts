import http from "./http";

export type PromoDiscountType = "FIXED" | "PERCENT";
export type PromoAppliesTo = "CATERING" | "CONSUMER" | "BOTH";

export interface PromoCodeDto {
  code: string;
  name?: string;
  description?: string;
  restaurantIds: string[];
  discountAmount: number;
  discountType: PromoDiscountType;
  currency?: string;
  maxDiscount?: number;
  minOrderValue?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  isActive?: boolean;
  validFrom?: string; // ISO
  expiresAt?: string; // ISO
  appliesTo: PromoAppliesTo;
}

const getPromoCodes = async () => {
  const res = await http.get("/promotions/promo-codes");
  return res.data;
};

const getPromoCode = async (code: string) => {
  const res = await http.get(`/promotions/promo-code/${encodeURIComponent(code)}`);
  return res.data;
};

const createPromoCode = async (dto: PromoCodeDto) => {
  const res = await http.post("/promotions/create-promo-code", dto);
  return res.data;
};

const updatePromoCode = async (code: string, dto: Partial<PromoCodeDto>) => {
  const res = await http.patch(`/promotions/update-promo-code/${encodeURIComponent(code)}`, dto);
  return res.data;
};

const deletePromoCode = async (code: string) => {
  const res = await http.delete(`/promotions/delete-promo-code/${encodeURIComponent(code)}`);
  return res.data;
};

const validatePromo = async (promoCode: string, userId: string | undefined, orderTotal: number) => {
  const res = await http.post("/promotions/validate-promo-code", { promoCode, userId, orderTotal });
  return res.data;
};

export default {
  getPromoCodes,
  getPromoCode,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  validatePromo,
};