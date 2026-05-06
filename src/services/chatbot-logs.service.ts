import http from './http';
import type { AxiosResponse } from 'axios';
import type { ChatbotSessionsListResponse, ChatbotSessionDetail } from '../types/chatbot-logs.types';

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
}

export default new ChatbotLogsService();
