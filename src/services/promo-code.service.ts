import http from "./http";

export type PromoDiscountType = "FIXED" | "PERCENT";
export type PromoAppliesTo = "CATERING" | "CONSUMER" | "BOTH";
export type PromoDiscountTarget = "FOOD_SUBTOTAL" | "VENUE_HIRE_FEE";
// MANUAL = campaign codes created here; COMPLETION_REWARD = generated per
// customer when their order completes, usable only by that customer.
export type PromoCodeKind = "MANUAL" | "COMPLETION_REWARD";

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
  validFrom?: string;
  expiresAt?: string;
  appliesTo: PromoAppliesTo;
  discountTarget: PromoDiscountTarget;
}

export interface PromoCodeResponse extends PromoCodeDto {
  id: string;
  currentUses: number;
  usesCount?: number;
  kind?: PromoCodeKind;
  assignedEmail?: string | null;
  assignedUserId?: string | null;
  issuedForOrderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidatePromoResponse {
  valid: boolean;
  discountAmount?: number;
  message?: string;
}

const getPromoCodes = async (kind?: PromoCodeKind): Promise<PromoCodeResponse[]> => {
  const res = await http.get<PromoCodeResponse[]>("/promotions/promo-codes", {
    params: kind ? { kind } : undefined,
  });
  return res.data;
};

const getPromoCode = async (code: string): Promise<PromoCodeResponse> => {
  const res = await http.get<PromoCodeResponse>(`/promotions/promo-code/${encodeURIComponent(code)}`);
  return res.data;
};

const createPromoCode = async (dto: PromoCodeDto): Promise<PromoCodeResponse> => {
  const res = await http.post<PromoCodeResponse>("/promotions/create-promo-code", dto);
  return res.data;
};

const updatePromoCode = async (code: string, dto: Partial<PromoCodeDto>): Promise<PromoCodeResponse> => {
  const res = await http.patch<PromoCodeResponse>(`/promotions/update-promo-code/${encodeURIComponent(code)}`, dto);
  return res.data;
};

const deletePromoCode = async (code: string): Promise<{ message: string }> => {
  const res = await http.delete<{ message: string }>(`/promotions/delete-promo-code/${encodeURIComponent(code)}`);
  return res.data;
};

const validatePromo = async (promoCode: string, userId: string | undefined, orderTotal: number): Promise<ValidatePromoResponse> => {
  const res = await http.post<ValidatePromoResponse>("/promotions/validate-promo-code", { promoCode, userId, orderTotal });
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
