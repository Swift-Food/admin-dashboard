export interface ReviewRestaurantEntry {
  restaurantId: string;
  restaurantName: string;
  score: number;
  comment: string | null;
}

export interface ReviewItemEntry {
  menuItemId: string;
  menuItemName: string;
  restaurantId: string | null;
  score: number;
  comment: string | null;
}

export interface ReviewRow {
  submissionId: string;
  orderId: string;
  orderReference: string | null;
  submittedAt: string;
  reviewerName: string | null;
  reviewerEmail: string | null;
  orderScore: number | null;
  orderComment: string | null;
  restaurants: ReviewRestaurantEntry[];
  items: ReviewItemEntry[];
}

export interface ReviewTotals {
  totalReviews: number;
  averageOrderScore: number;
  averageRestaurantScore: number;
  percentWithComment: number;
}

export interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReviewListResponse {
  data: ReviewRow[];
  totals: ReviewTotals;
  pagination: ReviewPagination;
}

export interface ReviewListParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  restaurantId?: string;
  minScore?: number;
  hasComment?: boolean;
}
