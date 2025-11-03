// services/corporate.service.ts

import axios from 'axios';
import type { CorporateOrder, CorporateOrderDetails, CorporateOrderStatusType } from '../types/corporate.types';


const API_URL = "https://swiftfoods-32981ec7b5a4.herokuapp.com" 

class CorporateService {
  async getAllOrders(): Promise<CorporateOrder[]> {
    const response = await axios.get(`${API_URL}/corporate-orders/admin/all`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  }

  async getOrderDetails(orderId: string): Promise<CorporateOrderDetails> {
    const response = await axios.get(
      `${API_URL}/corporate-orders/admin/${orderId}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      },
    );
    return response.data;
  }

  async updateDeliveryStatus(
    orderId: string,
    status: CorporateOrderStatusType,
    driverId?: string,
    trackingUrl?: string,
    notes?: string,
  ) {
    const response = await axios.patch(
      `${API_URL}/corporate-orders/admin/${orderId}/delivery-status`,
      { status, driverId, trackingUrl, notes },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      },
    );
    return response.data;
  }
}

export default new CorporateService();