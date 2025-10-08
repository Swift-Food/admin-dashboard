import http from "./http";

const getAllPayouts = async (status?: string) => {
    const url = 'driver-user/admin/payouts';
    const res = await http.get(url);
    return res.data;
}

const getPendingPayouts = async () => {
    const res = await http.get('driver-user/admin/payouts/pending');
    return res.data;
}

const completePayout = async (payoutId: string, adminNote?: string) => {
    const res = await http.patch(`driver-user/admin/payouts/${payoutId}/complete`, { adminNote });
    return res.data;
}

const failPayout = async (payoutId: string, errorMessage: string, refund: boolean = true) => {
    const res = await http.patch(`driver-user/admin/payouts/${payoutId}/fail`, { 
        errorMessage, 
        refund 
    });
    return res.data;
}

const getPayoutHistory = async (driverId: string) => {
    const res = await http.get(`driver-user/payout-history/${driverId}`);
    return res.data;
}

const canRequestPayout = async (driverId: string) => {
    const res = await http.get(`driver-user/can-request-payout/${driverId}`);
    return res.data;
}

const requestPayout = async (driverId: string, requestDto: {
    amount: number;
    paymentMethodId: string;
}) => {
    const res = await http.post(`driver-user/request-payout/${driverId}`, requestDto);
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