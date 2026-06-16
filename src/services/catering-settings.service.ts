import http from './http';
import type { AxiosResponse } from 'axios';

export interface CateringSettings {
  /** Minutes before event start that the driver collects from the restaurant. */
  collectionLeadMinutes: number;
}

export interface CateringSettingsResponse {
  settings: CateringSettings;
  defaults: CateringSettings;
  limits: { collectionLeadMinutes: { min: number; max: number } };
}

const BASE = '/admin/catering/settings';

class CateringSettingsService {
  async get(): Promise<CateringSettingsResponse> {
    const res: AxiosResponse<CateringSettingsResponse> = await http.get(BASE);
    return res.data;
  }

  async update(
    patch: CateringSettings,
  ): Promise<{ settings: CateringSettings }> {
    const res: AxiosResponse<{ settings: CateringSettings }> = await http.patch(
      BASE,
      patch,
    );
    return res.data;
  }
}

export default new CateringSettingsService();
