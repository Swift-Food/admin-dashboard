export interface ChatbotSessionSummary {
  sessionId: string;
  firstSeenTs: string;
  lastSeenTs: string;
  eventCount: number;
  llmCallCount: number;
  retrievalCount: number;
  feedbackCount: number;
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
        kind: string;
        retrievalEventId: number | null;
        itemId: string | null;
        restaurantId: string | null;
        reasonText: string | null;
        reasonBuckets: string[] | null;
      };
    };

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
  period: 'daily' | 'monthly';
  days: number;
}
