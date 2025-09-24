export interface GeneralAnalytics {
    id: string;
    totalUsers: number;
    newUsersThisMonth: number;
    ordersPerUser: number;
    repeatCustomers: number;
    customerRetentionRate: number; // percentage
    averageOrderValue: number; // in currency
    customerAcquisitionCost: number; // in currency
    customerLifetimeValue: number; // in currency
    churnRate: number; // percentage
    referralRate: number; // percentage
    createdAt: Date;
    updatedAt: Date;
}

// [
//     {
//         "id": "801a9973-386c-410f-9ee5-d6d6697fff4e",
//         "totalUsers": 46,
//         "newUsersThisMonth": 0,
//         "ordersPerUser": 2.3260869565217392,
//         "repeatCustomers": 4,
//         "customerRetentionRate": 8.695652173913043,
//         "averageOrderValue": 15.762429906542057,
//         "customerAcquisitionCost": 0,
//         "customerLifetimeValue": 439.97739130434786,
//         "churnRate": 100,
//         "referralRate": 0,
//         "createdAt": "2025-07-23T00:00:00.413Z",
//         "updatedAt": "2025-09-24T00:00:00.303Z"
//     }
// ]