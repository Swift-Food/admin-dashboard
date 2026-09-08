import http from './http';
import type { AxiosResponse } from 'axios';

/** One restaurant's line in a month's batch — an invoice, or why there isn't one. */
export interface CommissionInvoiceRow {
  restaurantId: string;
  restaurantName: string;
  commissionRate: number;
  included: boolean;
  excludedReason: 'house' | 'no-value' | 'missing-restaurant' | 'error' | null;
  excludedDetail: string | null;
  // Present only when `included`.
  invoiceSerial?: string;
  orderCount?: number;
  portions?: number;
  totalOrderValue?: number;
  totalNetCommission?: number;
  totalCommissionVat?: number;
  totalGrossCommission?: number;
  refundsTotal?: number;
  invoiceTotal?: number;
  restaurantVatNo?: string | null;
}

export interface CommissionInvoiceTotals {
  invoiceCount: number;
  orderCount: number;
  totalOrderValue: number;
  totalNetCommission: number;
  totalCommissionVat: number;
  totalGrossCommission: number;
  totalRefunds: number;
  invoiceTotal: number;
}

export interface CommissionDispatch {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: 'sent' | 'empty' | 'failed';
  trigger: 'cron' | 'manual';
  recipient: string | null;
  cc: string | null;
  /** Set when the redirect flag diverted this pack away from the real recipient. */
  redirectedFrom: string | null;
  invoiceCount: number;
  orderCount: number;
  totalOrderValue: string;
  totalGrossCommission: string;
  error: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

export interface CommissionInvoiceMonth {
  year: number;
  month: number;
  periodLabel: string;
  totals: CommissionInvoiceTotals;
  rows: CommissionInvoiceRow[];
  recipients: {
    recipient: string;
    cc: string;
    enabled: boolean;
    sendDay: number;
    /** While true the pack goes to `redirectTo` instead of `recipient`. */
    redirectEnabled: boolean;
    redirectTo: string;
  };
  lastDispatch: CommissionDispatch | null;
}

export interface DispatchResult {
  status: 'sent' | 'empty' | 'failed';
  periodLabel: string;
  recipient: string;
  cc: string;
  redirectedFrom?: string | null;
  invoiceCount: number;
  orderCount: number;
  totalOrderValue: number;
  totalGrossCommission: number;
  error?: string;
  dispatchId?: string;
}

const BASE = '/admin/commission-invoices';

class CommissionInvoicesService {
  async getMonth(year: number, month: number): Promise<CommissionInvoiceMonth> {
    const res: AxiosResponse<CommissionInvoiceMonth> = await http.get(BASE, {
      params: { year, month },
    });
    return res.data;
  }

  async getDispatches(limit = 24): Promise<CommissionDispatch[]> {
    const res: AxiosResponse<{ dispatches: CommissionDispatch[] }> = await http.get(
      `${BASE}/dispatches`,
      { params: { limit } },
    );
    return res.data.dispatches;
  }

  async send(
    year: number,
    month: number,
    overrides?: { recipient?: string; cc?: string },
  ): Promise<DispatchResult> {
    const res: AxiosResponse<{ result: DispatchResult }> = await http.post(
      `${BASE}/send`,
      { year, month, ...overrides },
    );
    return res.data.result;
  }

  // Documents are behind the admin JWT, so they're fetched as blobs rather
  // than linked directly — a plain <a href> would arrive unauthenticated.
  async getInvoicePdf(restaurantId: string, year: number, month: number): Promise<Blob> {
    const res = await http.get(`${BASE}/pdf`, {
      params: { restaurantId, year, month },
      responseType: 'blob',
    });
    return res.data as Blob;
  }

  async getInvoiceHtml(restaurantId: string, year: number, month: number): Promise<Blob> {
    const res = await http.get(`${BASE}/html`, {
      params: { restaurantId, year, month },
      responseType: 'blob',
    });
    return res.data as Blob;
  }

  async getMonthCsv(year: number, month: number): Promise<Blob> {
    const res = await http.get(`${BASE}/csv`, {
      params: { year, month },
      responseType: 'blob',
    });
    return res.data as Blob;
  }
}

export default new CommissionInvoicesService();
