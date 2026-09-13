/**
 * Shapes returned by `GET /admin/email-templates`.
 *
 * The API filters `internal` templates out server-side, so that audience is
 * deliberately absent from `EmailAudience`: it can never reach the dashboard.
 */
export type EmailAudience = 'customer' | 'restaurant' | 'driver' | 'partner';

export type EmailVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'null';

export interface EmailTemplateVariable {
  name: string;
  type: EmailVariableType;
  /** Pre-formatted sample, e.g. "12345" or "Array(4)". Always a string. */
  sampleValue: string;
}

export interface EmailTemplateSummary {
  id: string;
  name: string;
  description: string;
  audience: EmailAudience;
  group: string;
  subjectPreview: string;
  variables: EmailTemplateVariable[];
  /**
   * Names of alternate sample-param sets the template declares. Empty for
   * every template today; the UI hides the selector when it is empty.
   */
  variants: string[];
}

export interface EmailTemplatePreview extends EmailTemplateSummary {
  /** A complete HTML document, for an iframe `srcDoc`. Never inject it inline. */
  html: string;
  /** The variant actually rendered; null means the default sampleParams. */
  variant: string | null;
}

export interface EmailTemplateListResponse {
  templates: EmailTemplateSummary[];
}
