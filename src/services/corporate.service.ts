import http from './http';
import type { AxiosResponse } from 'axios';
import type {
  AdminCorporateOrderSummary,
  AdminCorporateOrderDetails,
  CorporateOrderStatusType,
} from '../types/admin-corporate.types';

class CorporateService {
  async getAllOrders(): Promise<AdminCorporateOrderSummary[]> {
    const response: AxiosResponse<AdminCorporateOrderSummary[]> = await http.get(
      '/corporate-orders/admin/all'
    );
    return response.data;
  }

  async getOrderDetails(orderId: string): Promise<AdminCorporateOrderDetails> {
    const response: AxiosResponse<AdminCorporateOrderDetails> = await http.get(
      `/corporate-orders/admin/${orderId}`
    );
    return response.data;
  }

  async updateDeliveryStatus(
    orderId: string,
    status: CorporateOrderStatusType,
    driverId?: string,
    trackingUrl?: string,
    notes?: string,
  ): Promise<AdminCorporateOrderDetails> {
    const response: AxiosResponse<AdminCorporateOrderDetails> = await http.patch(
      `/corporate-orders/admin/${orderId}/delivery-status`,
      { status, driverId, trackingUrl, notes }
    );
    return response.data;
  }
}

export default new CorporateService();