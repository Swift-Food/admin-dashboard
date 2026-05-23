import http from './http';
import type { AxiosResponse } from 'axios';
import type { ChatbotSessionsListResponse, ChatbotSessionDetail, CostsResponse, FeedbackListResponse } from '../types/chatbot-logs.types';

class ChatbotLogsService {
  async listSessions(params: {
    limit?: number;
    cursor?: string;
    status?: 'active' | 'completed' | 'abandoned' | 'errored';
    q?: string;
    since?: string;
  } = {}): Promise<ChatbotSessionsListResponse> {
    const response: AxiosResponse<ChatbotSessionsListResponse> = await http.get('/admin/chatbot-sessions', { params });
    return response.data;
  }

  async getSession(sessionId: string): Promise<ChatbotSessionDetail> {
    const response: AxiosResponse<ChatbotSessionDetail> = await http.get(`/admin/chatbot-sessions/${sessionId}`);
    return response.data;
  }

  async getCosts(params: {
    period?: 'hourly' | 'daily' | 'monthly';
    days?: number;
  } = {}): Promise<CostsResponse> {
    const response: AxiosResponse<CostsResponse> = await http.get('/admin/chatbot-sessions/costs', { params });
    return response.data;
  }

  async listFeedback(params: {
    status?: 'open' | 'addressed' | 'all';
    limit?: number;
  } = {}): Promise<FeedbackListResponse> {
    const response: AxiosResponse<FeedbackListResponse> = await http.get('/admin/chatbot-sessions/feedback', { params });
    return response.data;
  }

  async updateFeedback(id: string, isAddressed: boolean): Promise<{ ok: true }> {
    const response: AxiosResponse<{ ok: true }> = await http.patch(
      `/admin/chatbot-sessions/feedback/${id}`,
      { isAddressed },
    );
    return response.data;
  }
}

export default new ChatbotLogsService();
