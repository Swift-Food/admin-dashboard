export interface PartnerSpace {
  id: string;
  name: string;
  slug: string;
  publishableKey: string;
  isActive: boolean;
  contactEmail: string;
  webhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerSpaceDto {
  name: string;
  slug: string;
  contactEmail: string;
  webhookUrl?: string;
}

export interface UpdatePartnerSpaceDto {
  name?: string;
  slug?: string;
  contactEmail?: string;
  webhookUrl?: string;
  isActive?: boolean;
}
