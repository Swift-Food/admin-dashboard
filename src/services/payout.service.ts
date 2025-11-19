import http from "./http";
import type { Payout } from "../types/payout.types";

const getAllPayouts = async (): Promise<Payout[]> => {
    const url = 'driver-user/admin/payouts';
    const res = await http.get<Payout[]>(url);
    return res.data;
}

const getPendingPayouts = async (): Promise<Payout[]> => {
    const res = await http.get<Payout[]>('driver-user/admin/payouts/pending');
    return res.data;
}

const completePayout = async (payoutId: string, adminNote?: string): Promise<Payout> => {
    const res = await http.patch<Payout>(`driver-user/admin/payouts/${payoutId}/complete`, { adminNote });
    return res.data;
}

const failPayout = async (payoutId: string, errorMessage: string, refund: boolean = true): Promise<Payout> => {
    const res = await http.patch<Payout>(`driver-user/admin/payouts/${payoutId}/fail`, {
        errorMessage,
        refund
    });
    return res.data;
}

const getPayoutHistory = async (driverId: string): Promise<Payout[]> => {
    const res = await http.get<Payout[]>(`driver-user/payout-history/${driverId}`);
    return res.data;
}

const canRequestPayout = async (driverId: string): Promise<{ canRequest: boolean; reason?: string }> => {
    const res = await http.get<{ canRequest: boolean; reason?: string }>(`driver-user/can-request-payout/${driverId}`);
    return res.data;
}

const requestPayout = async (driverId: string, requestDto: {
    amount: number;
    paymentMethodId: string;
}): Promise<Payout> => {
    const res = await http.post<Payout>(`driver-user/request-payout/${driverId}`, requestDto);
    return res.data;
}

export default {
    getAllPayouts,
    getPendingPayouts,
    completePayout,
    failPayout,
    getPayoutHistory,
    canRequestPayout,
    requestPayout,
};
