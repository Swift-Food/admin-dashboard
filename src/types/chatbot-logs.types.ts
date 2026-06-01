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
        cachedInputTokens: number | null;
        outputTokens: number | null;
        thinkingTokens: number | null;
        latencyMs: number | null;
        costUsd: number | null;
        /** Per-call cost split, computed server-side from the shared pricing
         *  table. inputCostUsd already includes the cache discount;
         *  cachedInputCostUsd is its 25%-rate portion. */
        inputCostUsd: number | null;
        cachedInputCostUsd: number | null;
        outputCostUsd: number | null;
        thinkingCostUsd: number | null;
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

/** Cost variant — derived from llm_calls.caller on the backend.
 *  legacy = `tool_calling_loop`; pipeline_v1 = `pipeline_v1.*`; other = anything else. */
export type CostVariantKey = 'legacy' | 'pipeline_v1' | 'other';

/** Per-bucket cost + token totals. Shared shape between the top-level
 *  CostPeriodItem and each per-variant slice under byVariant. */
export interface CostBucket {
  totalCostUsd: number;
  totalInputTokens: number;
  /** Subset of totalInputTokens served from Gemini context cache (billed at
   *  25%). Uncached = totalInputTokens - totalCachedInputTokens. */
  totalCachedInputTokens: number;
  totalOutputTokens: number;
  totalThinkingTokens: number;
  inputCostUsd: number;
  /** Cached portion of inputCostUsd. Uncached input cost = inputCostUsd - this. */
  cachedInputCostUsd: number;
  outputCostUsd: number;
  thinkingCostUsd: number;
  callCount: number;
  /** Distinct turn_id count (pipeline_v1 turns produce 2-3 calls each, so
   *  callCount overstates turn count for them). Use for cost-per-turn math. */
  turnCount: number;
}

export interface CostPeriodItem extends CostBucket {
  period: string;
  sessionCount: number;
  /** Per-variant breakdown for this period. Only variants with rows appear.
   *  Optional: a backend predating per-variant cost tracking omits it, so
   *  consumers must treat it as possibly-absent. */
  byVariant?: Partial<Record<CostVariantKey, CostBucket>>;
}

export interface CostsResponse {
  items: CostPeriodItem[];
  totalCostUsd: number;
  totalCalls: number;
  totalSessions: number;
  /** Window-wide rollup, one bucket per variant. Always present for all
   *  three keys (zero-filled when empty) so the dashboard headline ("X% of
   *  spend is pipeline_v1") doesn't need null guards. */
  variantTotals: Record<CostVariantKey, CostBucket>;
  period: 'hourly' | 'daily' | 'monthly';
  days: number;
}
