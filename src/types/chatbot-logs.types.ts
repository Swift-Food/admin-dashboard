export interface ChatbotSessionSummary {
  sessionId: string;
  firstSeenTs: string;
  lastSeenTs: string;
  eventCount: number;
  llmCallCount: number;
  retrievalCount: number;
  feedbackCount: number;
  /** Unaddressed feedback rows for this session. Drives the open-issue badge. */
  openFeedbackCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalLatencyMs: number;
  totalCostUsd: number;
  errorCount: number;
  inferredStatus: 'active' | 'completed' | 'abandoned' | 'errored';
}

export interface ChatbotSessionsListResponse {
  items: ChatbotSessionSummary[];
  nextCursor: string | null;
  total: number;
}

export type TimelineEntry =
  | {
      kind: 'event';
      ts: string;
      data: {
        id: number;
        eventType: string;
        payload: any;
      };
    }
  | {
      kind: 'llm_call';
      ts: string;
      data: {
        id: number;
        caller: string;
        model: string;
        inputTokens: number | null;
        outputTokens: number | null;
        thinkingTokens: number | null;
        latencyMs: number | null;
        costUsd: number | null;
        turnId: string | null;
        errorType: string | null;
        errorMessage: string | null;
        prompt: any;
        response: any;
      };
    }
  | {
      kind: 'retrieval';
      ts: string;
      data: {
        id: number;
        queryText: string;
        restaurantId: string | null;
        retrievedTopK: any;
        composerPicks: any;
        composerLlmAccepted: boolean;
        composerFallbackReason: string | null;
        buildStatus: string;
        buildMode: string;
        taxonomySnapshot: any;
      };
    }
  | {
      kind: 'feedback';
      ts: string;
      data: {
        id: number;
        botReplyEventId: number | null;
        rating: number;
        note: string | null;
        source: string;
        isAddressed: boolean;
        addressedAt: string | null;
      };
    };

/** A row in the feedback / issue tracker. */
export interface ChatFeedbackItem {
  id: string;
  sessionId: string;
  botReplyEventId: number | null;
  rating: number;
  note: string | null;
  source: 'user' | 'internal' | string;
  isAddressed: boolean;
  createdAt: string;
  addressedAt: string | null;
}

export interface FeedbackListResponse {
  items: ChatFeedbackItem[];
  status: 'open' | 'addressed' | 'all';
  count: number;
}

export interface ChatbotSessionDetail {
  sessionId: string;
  firstSeenTs: string;
  lastSeenTs: string;
  inferredStatus: 'active' | 'completed' | 'abandoned' | 'errored';
  totals: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    costUsd: number;
    eventCount: number;
    llmCallCount: number;
    retrievalCount: number;
    feedbackCount: number;
    errorCount: number;
  };
  timeline: TimelineEntry[];
}

export interface CostPeriodItem {
  period: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalThinkingTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  thinkingCostUsd: number;
  callCount: number;
  sessionCount: number;
}

export interface CostsResponse {
  items: CostPeriodItem[];
  totalCostUsd: number;
  totalCalls: number;
  totalSessions: number;
  period: 'hourly' | 'daily' | 'monthly';
  days: number;
}
