import http from './http';
import type { AxiosResponse } from 'axios';

export interface CateringSettings {
  /** Minutes before event start that the courier collects from the restaurant. */
  collectionLeadMinutes: number;
  /** Auto-book a Pedivan courier when a session enters the lead window. */
  autoBookCourier: boolean;
  /** Hours before collection that auto-booking fires. */
  autoBookLeadHours: number;
  /** Issue a one-time discount code to the customer when their order completes. */
  completionRewardEnabled: boolean;
  /** Percentage off the food subtotal on the customer's next order. */
  completionRewardPercent: number;
  /** Cap on the discount in pounds; 0 means no cap. */
  completionRewardMaxDiscount: number;
  /** Days the reward code stays valid from the day it is issued. */
  completionRewardValidDays: number;
}

export interface Range {
  min: number;
  max: number;
}

export interface CateringSettingsResponse {
  settings: CateringSettings;
  defaults: CateringSettings;
  limits: {
    collectionLeadMinutes: Range;
    autoBookLeadHours: Range;
    completionRewardPercent: Range;
    completionRewardMaxDiscount: Range;
    completionRewardValidDays: Range;
  };
}

const BASE = '/admin/catering/settings';

class CateringSettingsService {
  async get(): Promise<CateringSettingsResponse> {
    const res: AxiosResponse<CateringSettingsResponse> = await http.get(BASE);
    return res.data;
  }

  async update(
    patch: Partial<CateringSettings>,
  ): Promise<{ settings: CateringSettings }> {
    const res: AxiosResponse<{ settings: CateringSettings }> = await http.patch(
      BASE,
      patch,
    );
    return res.data;
  }
}

export default new CateringSettingsService();
