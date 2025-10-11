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
};