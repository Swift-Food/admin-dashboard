export interface OrderFinancialsCell {
  restaurantId: string;
  restaurantName: string;
  restaurantStatus: string | null;
  year: number;
  month: number;
  monthName: string;
  period: string;
  orderCount: number;
  grossSales: number;
  restaurantNet: number;
  commission: number;
  effectiveRatePct: number;
}

export interface OrderFinancialsRestaurant {
  restaurantId: string;
  restaurantName: string;
  status?: string;
  totalOrders: number;
  totalCommission: number;
  totalOrderValue: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
}

export interface OrderFinancialsGrandTotals {
  orderCount: number;
  grossSales: number;
  restaurantNet: number;
  commission: number;
}

export interface OrderFinancialsOverviewResponse {
  cells: OrderFinancialsCell[];
  restaurants: OrderFinancialsRestaurant[];
  grandTotals: OrderFinancialsGrandTotals;
}

export interface OrderFinancialsOverviewParams {
  from?: string;
  to?: string;
}
