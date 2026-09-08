import type { AxiosResponse } from 'axios';
import http from './http';
import type {
  EmailTemplateListResponse,
  EmailTemplatePreview,
  EmailTemplateSummary,
} from '../types/email-templates.types';

const BASE = '/admin/email-templates';

class EmailTemplatesService {
  async list(): Promise<EmailTemplateSummary[]> {
    const res: AxiosResponse<EmailTemplateListResponse> = await http.get(BASE);
    return res.data.templates;
  }

  /**
   * Renders one template from its own sample params. The API accepts no
   * caller-supplied data beyond the optional variant name.
   */
  async preview(id: string, variant?: string): Promise<EmailTemplatePreview> {
    const res: AxiosResponse<EmailTemplatePreview> = await http.get(
      `${BASE}/${encodeURIComponent(id)}/preview`,
      variant ? { params: { variant } } : undefined,
    );
    return res.data;
  }
}

export default new EmailTemplatesService();
