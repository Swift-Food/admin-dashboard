import type { WithdrawalRequest } from "../pages/PayoutScreen";
import http from "./http";

export const withdrawalService = {
  getAllWithdrawals: async (): Promise<WithdrawalRequest[]> => {
    const res = await http.get<WithdrawalRequest[]>("/withdrawals/admin");
    return res.data;
  },

  approveWithdrawal: async (id: string): Promise<void> => {
    await http.post(`/withdrawals/${id}/approve`);
  },

  rejectWithdrawal: async (id: string, reason: string): Promise<void> => {
    await http.post(`/withdrawals/${id}/reject`, { reason });
  },

  getPayoutInfo: async (id: string): Promise<any> => {
    const res = await http.get(`/withdrawals/payout-info/${id}`);
    return res.data;
  },

  reconcile: async (): Promise<{ checked: number; updated: number }> => {
    const res = await http.post<{ checked: number; updated: number }>("/withdrawals/admin/reconcile");
    return res.data;
  },

  /** Remittance advice PDF for one withdrawal (exists once it has a payout). */
  downloadRemittance: async (id: string): Promise<Blob> => {
    const res = await http.get(`/withdrawals/${id}/remittance`, { responseType: "blob" });
    return res.data as Blob;
  },
};
