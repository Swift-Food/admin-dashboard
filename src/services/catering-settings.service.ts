import http from './http';
import type { AxiosResponse } from 'axios';

export interface CateringSettings {
  /** Minutes before event start that the courier collects from the restaurant. */
  collectionLeadMinutes: number;
  /** Auto-book a Pedivan courier when a session enters the lead window. */
  autoBookCourier: boolean;
  /** Hours before collection that auto-booking fires. */
  autoBookLeadHours: number;
}

export interface CateringSettingsResponse {
  settings: CateringSettings;
  defaults: CateringSettings;
  limits: {
    collectionLeadMinutes: { min: number; max: number };
    autoBookLeadHours: { min: number; max: number };
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
