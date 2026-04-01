export interface CoworkingSpace {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  depositEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSpacesResponse {
  items: CoworkingSpace[];
  total: number;
  skip: number;
  take: number;
}
