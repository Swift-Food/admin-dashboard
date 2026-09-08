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
  /** Max distance (miles) Swift will courier a catering order for a restaurant that does not self-deliver. */
  maxCourierDeliveryMiles: number;
  /** Email last month's commission invoices to the bookkeeper automatically. */
  commissionInvoiceEmailEnabled: boolean;
  /** Primary recipient for the monthly commission-invoice pack. */
  commissionInvoiceRecipient: string;
  /** Comma-separated CC list for that email. */
  commissionInvoiceCc: string;
  /** Day of the month the previous month's pack is sent (1-28). */
  commissionInvoiceSendDay: number;
  /** While true the pack is diverted to commissionInvoiceRedirectTo for testing. */
  commissionInvoiceRedirectEnabled: boolean;
  /** Test destination used while the redirect is on. */
  commissionInvoiceRedirectTo: string;
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
    maxCourierDeliveryMiles: Range;
    commissionInvoiceSendDay?: Range;
    commissionInvoiceCcCount?: Range;
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
