export interface PartnerSpace {
  id: string;
  name: string;
  slug: string;
  publishableKey: string;
  isActive: boolean;
  aiChatEnabled: boolean;
  contactEmail: string;
  webhookUrl: string | null;
  allowedOrigins: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerSpaceDto {
  name: string;
  slug: string;
  contactEmail: string;
  webhookUrl?: string;
  allowedOrigins?: string[];
  aiChatEnabled?: boolean;
}

export interface UpdatePartnerSpaceDto {
  name?: string;
  slug?: string;
  contactEmail?: string;
  webhookUrl?: string | null;
  allowedOrigins?: string[];
  isActive?: boolean;
  aiChatEnabled?: boolean;
}
