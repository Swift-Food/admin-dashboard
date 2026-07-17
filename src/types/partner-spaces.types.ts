/** Which AI chat path runs for this partner. `legacy` is today's single
 *  Pro generateWithTools call; `pipeline_v1` is the multi-stage Flash
 *  pipeline. Flag-gated rollout — flip per partner via the admin form. */
export type AiPipelineVariant = 'legacy' | 'pipeline_v1';

export interface PartnerSpaceTheme {
  primary?: string;
}

export interface PartnerSpace {
  id: string;
  name: string;
  slug: string;
  publishableKey: string;
  isActive: boolean;
  aiChatEnabled: boolean;
  aiPipelineVariant: AiPipelineVariant;
  contactEmail: string;
  webhookUrl: string | null;
  allowedOrigins: string[];
  logoImageUrl: string | null;
  theme: PartnerSpaceTheme | null;
  commission: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerSpaceDto {
  name: string;
  slug: string;
  contactEmail: string;
  adminEmail: string;
  adminName: string;
  webhookUrl?: string;
  allowedOrigins?: string[];
  aiChatEnabled?: boolean;
  aiPipelineVariant?: AiPipelineVariant;
  logoImageUrl?: string;
  theme?: PartnerSpaceTheme;
}

export interface UpdatePartnerSpaceDto {
  name?: string;
  slug?: string;
  contactEmail?: string;
  webhookUrl?: string | null;
  allowedOrigins?: string[];
  isActive?: boolean;
  aiChatEnabled?: boolean;
  aiPipelineVariant?: AiPipelineVariant;
  logoImageUrl?: string | null;
  theme?: PartnerSpaceTheme | null;
}
