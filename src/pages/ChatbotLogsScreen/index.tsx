import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import chatbotLogsService from '../../services/chatbot-logs.service';
import type {
  ChatbotSessionSummary,
  ChatbotSessionDetail,
  TimelineEntry,
  CostsResponse,
} from '../../types/chatbot-logs.types';
import { SnapshotModal } from '../../features/chatbot-snapshot/SnapshotModal';
import {
  FullSessionModal,
  type SessionTurn,
  type TurnEntry,
} from '../../features/chatbot-snapshot/FullSessionModal';
import {
  isMealSessionView,
  type MealSessionView,
} from '../../features/chatbot-snapshot/types';
import { JsonView, JsonModal, type JsonViewControl } from '../../components/JsonModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(isoTs: string): string {
  const diffMs = Date.now() - new Date(isoTs).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatAbsoluteDate(isoTs: string): string {
  return new Date(isoTs).toLocaleString();
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatOffsetMs(startIso: string, entryIso: string): string {
  const diffMs = new Date(entryIso).getTime() - new Date(startIso).getTime();
  if (diffMs < 0) return '+0ms';
  if (diffMs >= 1000) return `+${(diffMs / 1000).toFixed(1)}s`;
  return `+${diffMs}ms`;
}

function formatCost(usd: number | null | undefined): string {
  if (usd == null || usd === 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
};

function tokenCost(tokens: number, ratePerMillion: number): number {
  return (tokens * ratePerMillion) / 1_000_000;
}

function formatTokenCostBreakdown(
  model: string,
  inputTokens: number | null,
  outputTokens: number | null,
  thinkingTokens: number | null,
): { inputCost: string; outputCost: string; thinkingCost: string } | null {
  const rates = MODEL_RATES[model];
  if (!rates || inputTokens == null) return null;
  return {
    inputCost: formatCost(tokenCost(inputTokens, rates.input)),
    outputCost: formatCost(tokenCost(outputTokens ?? 0, rates.output)),
    thinkingCost: formatCost(tokenCost(thinkingTokens ?? 0, rates.output)),
  };
}

function shortId(sessionId: string): string {
  return sessionId.slice(0, 8) + '…';
}

// Extract the user-typed text from a `user_message` event payload.
// New shape nests the request under `payload.input.message`; older rows
// stored it at `payload.message`. Read either.
function extractUserMessageText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const input = p.input;
  if (input && typeof input === 'object') {
    const inputMsg = (input as Record<string, unknown>).message;
    if (typeof inputMsg === 'string') return inputMsg;
  }
  if (typeof p.message === 'string') return p.message;
  return null;
}

// Pull the nested `response` object off a bot_reply / action_reply
// payload. Returns null if missing or the wrong shape.
function extractBotResponse(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const r = p.response;
  if (!r || typeof r !== 'object') return null;
  return r as Record<string, unknown>;
}

// Pull `response.mealSessions` off a bot_reply payload. Post-
// consolidation this is where meal-session picker data lives — meal
// sessions are no longer ferried through `MessagePart[]`.
function extractMealSessions(payload: unknown): MealSessionView[] {
  const response = extractBotResponse(payload);
  if (!response) return [];
  const ms = response.mealSessions;
  if (!Array.isArray(ms)) return [];
  return ms.filter(isMealSessionView);
}

// ─── JSON viewer ─────────────────────────────────────────────────────────────
// JsonView, JsonModal, and JsonViewControl are imported from
// '../../components/JsonModal' so the snapshot preview modals can reuse them.

function JsonBlock({
  label,
  value,
  className = '',
  modalExtras,
}: {
  label: string;
  value: unknown;
  className?: string;
  modalExtras?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [control, setControl] = useState<JsonViewControl>({ version: 0, mode: 'reset' });

  return (
    <div className={`text-xs ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="cursor-pointer select-none text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <span className="inline-block w-3">{open ? '▼' : '▶'}</span>
          <span>{label}</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
          className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 hover:text-blue-600 px-1.5 py-0.5 rounded border border-gray-200 hover:border-blue-300 bg-white"
          title="Open in modal"
        >
          ⛶ modal
        </button>
        {open && (
          <>
            <button
              type="button"
              onClick={() => setControl(c => ({ version: c.version + 1, mode: 'expand-all' }))}
              className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 hover:text-blue-600 px-1.5 py-0.5 rounded border border-gray-200 hover:border-blue-300 bg-white"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setControl(c => ({ version: c.version + 1, mode: 'reset' }))}
              className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 hover:text-blue-600 px-1.5 py-0.5 rounded border border-gray-200 hover:border-blue-300 bg-white"
            >
              Collapse all
            </button>
          </>
        )}
      </div>
      {open && (
        <div className="mt-1 bg-white rounded border border-gray-200 p-2 font-mono text-xs leading-relaxed overflow-auto max-h-96">
          <JsonView value={value} control={control} />
        </div>
      )}
      {modalOpen && (
        <JsonModal title={label} value={value} extras={modalExtras} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

// ─── Top-K block (with sort controls) ───────────────────────────────────────

type TopKSortMode = 'final' | 'lexical' | 'vector';

interface TopKItem {
  id?: string;
  name?: string;
  restaurantId?: string;
  restaurantName?: string;
  score?: number;
  lexicalRank?: number | null;
  vectorRank?: number | null;
}

interface TopKGroup {
  intent?: string;
  category?: string | null;
  restaurantScope?: string[] | null;
  items?: TopKItem[];
  [key: string]: unknown;
}

function sortTopK(value: unknown, mode: TopKSortMode): unknown {
  if (!Array.isArray(value)) return value;

  const cmpAsc = (a: number | null | undefined, b: number | null | undefined) =>
    (a ?? Number.POSITIVE_INFINITY) - (b ?? Number.POSITIVE_INFINITY);

  return (value as TopKGroup[]).map((group) => {
    if (!group || !Array.isArray(group.items)) return group;
    const items = [...group.items];
    if (mode === 'lexical')   items.sort((a, b) => cmpAsc(a.lexicalRank, b.lexicalRank));
    else if (mode === 'vector') items.sort((a, b) => cmpAsc(a.vectorRank, b.vectorRank));
    else if (mode === 'final')  items.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
    return { ...group, items };
  });
}

const TOPK_SORT_LABELS: Record<TopKSortMode, string> = {
  final:   'Final score',
  lexical: 'Lexical rank',
  vector:  'Vector rank',
};

function TopKBlock({ value, className = '' }: { value: unknown; className?: string }) {
  const [sortMode, setSortMode] = useState<TopKSortMode>('final');
  const sorted = sortTopK(value, sortMode);

  const renderSortRow = () => (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] uppercase tracking-wide text-gray-500 mr-1">Sort items:</span>
      {(Object.keys(TOPK_SORT_LABELS) as TopKSortMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setSortMode(m)}
          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
            sortMode === m
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {TOPK_SORT_LABELS[m]}
        </button>
      ))}
    </div>
  );

  return (
    <div className={className}>
      <div className="mb-1">{renderSortRow()}</div>
      <JsonBlock label="Retrieved top-K" value={sorted} modalExtras={renderSortRow()} />
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-800' },
  abandoned: { label: 'Abandoned', cls: 'bg-gray-100 text-gray-600' },
  errored:   { label: 'Errored',   cls: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Timeline cards ──────────────────────────────────────────────────────────

function EventCard({
  entry,
  offsetLabel,
  previousUserMessage,
  turnEntries,
}: {
  entry: Extract<TimelineEntry, { kind: 'event' }>;
  offsetLabel: string;
  previousUserMessage?: string | null;
  turnEntries?: TurnEntry[];
}) {
  const isUser  = entry.data.eventType === 'user_message';
  const isBot   = entry.data.eventType === 'bot_reply';
  const tint    = isUser ? 'border-blue-300 bg-blue-50' : isBot ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white';

  const payload = entry.data.payload as unknown;
  const userMessageText = isUser ? extractUserMessageText(payload) : null;

  const [showSnapshot, setShowSnapshot] = useState(false);

  // Pull text + parts + mealSessions off the bot_reply payload. The
  // backend nests the outgoing chat response under `payload.response`
  // (untyped on the wire).
  const botResponse = isBot ? extractBotResponse(payload) : null;
  const botText =
    botResponse && typeof botResponse.message === 'string' ? botResponse.message : '';
  const botParts = botResponse && 'parts' in botResponse ? botResponse.parts : null;
  const botMealSessions = isBot ? extractMealSessions(payload) : [];

  return (
    <div className={`rounded-lg border ${tint} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400 w-14 shrink-0" title={formatAbsoluteDate(entry.ts)}>
          {offsetLabel}
        </span>
        <span className="font-semibold text-sm text-gray-800">{entry.data.eventType}</span>
        {isBot && (
          <button
            type="button"
            onClick={() => setShowSnapshot(true)}
            className="ml-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5 hover:bg-indigo-100 transition-colors"
          >
            View preview
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">event #{entry.data.id}</span>
      </div>
      {userMessageText !== null && (
        <div className="mb-2 text-sm text-gray-900 whitespace-pre-wrap break-words">
          <span className="font-mono text-xs text-gray-500">user_message: </span>
          {userMessageText}
        </div>
      )}
      <JsonBlock label="payload" value={entry.data.payload} />

      {isBot && showSnapshot && (
        <SnapshotModal
          userText={previousUserMessage ?? null}
          botText={botText}
          rawBotParts={botParts}
          mealSessions={botMealSessions}
          turnEntries={turnEntries}
          onClose={() => setShowSnapshot(false)}
        />
      )}
    </div>
  );
}

function LlmCallCard({ entry, offsetLabel }: { entry: Extract<TimelineEntry, { kind: 'llm_call' }>; offsetLabel: string }) {
  const hasError = !!entry.data.errorType;
  const border   = hasError ? 'border-l-4 border-l-red-500 border-t border-r border-b border-red-200 bg-red-50' : 'border border-indigo-200 bg-indigo-50';

  return (
    <div className={`rounded-lg ${border} p-3`}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs text-gray-400 w-14 shrink-0" title={formatAbsoluteDate(entry.ts)}>
          {offsetLabel}
        </span>
        <span className="font-bold text-sm text-indigo-800">{entry.data.caller}</span>
        <span className="text-xs text-indigo-500">{entry.data.model}</span>
        {entry.data.latencyMs != null && (
          <span className="text-xs text-gray-500">{formatLatency(entry.data.latencyMs)}</span>
        )}
        <span className="ml-auto text-xs text-gray-400">llm #{entry.data.id}</span>
      </div>
      {(entry.data.inputTokens != null || entry.data.outputTokens != null) && (() => {
        const breakdown = formatTokenCostBreakdown(
          entry.data.model, entry.data.inputTokens, entry.data.outputTokens, entry.data.thinkingTokens,
        );
        return (
          <div className="text-xs text-gray-600 mb-1">
            <span>{entry.data.inputTokens ?? '?'} in</span>
            {breakdown && <span className="text-emerald-600"> ({breakdown.inputCost})</span>}
            <span> · {entry.data.outputTokens ?? '?'} out</span>
            {breakdown && <span className="text-emerald-600"> ({breakdown.outputCost})</span>}
            {entry.data.thinkingTokens ? (
              <>
                <span> · {entry.data.thinkingTokens} thinking</span>
                {breakdown && <span className="text-emerald-600"> ({breakdown.thinkingCost})</span>}
              </>
            ) : null}
            {entry.data.costUsd != null && (
              <span className="ml-2 font-semibold text-emerald-700">= {formatCost(entry.data.costUsd)}</span>
            )}
            {entry.data.turnId && (
              <span className="ml-2 text-gray-400" title={entry.data.turnId}>turn {entry.data.turnId.slice(0, 8)}</span>
            )}
          </div>
        );
      })()}
      {hasError && (
        <div className="mb-2">
          <p className="text-xs font-bold text-red-700">{entry.data.errorType}</p>
          {entry.data.errorMessage && (
            <p className="text-xs text-red-600 mt-0.5">{entry.data.errorMessage}</p>
          )}
        </div>
      )}
      <div className="flex gap-3 flex-wrap">
        <JsonBlock label="Prompt"   value={entry.data.prompt}   className="flex-1 min-w-0" />
        <JsonBlock label="Response" value={entry.data.response} className="flex-1 min-w-0" />
      </div>
    </div>
  );
}

function RetrievalCard({ entry, offsetLabel }: { entry: Extract<TimelineEntry, { kind: 'retrieval' }>; offsetLabel: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs text-gray-400 w-14 shrink-0" title={formatAbsoluteDate(entry.ts)}>
          {offsetLabel}
        </span>
        <span className="italic text-sm text-gray-800 flex-1">"{entry.data.queryText}"</span>
        <span className="ml-auto text-xs text-gray-400">retrieval #{entry.data.id}</span>
      </div>
      <div className="flex gap-2 flex-wrap mb-2">
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800">
          {entry.data.buildStatus}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
          {entry.data.buildMode}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          entry.data.composerLlmAccepted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          LLM {entry.data.composerLlmAccepted ? 'accepted' : 'rejected'}
        </span>
        {entry.data.composerFallbackReason && (
          <span className="text-xs text-orange-600 italic">{entry.data.composerFallbackReason}</span>
        )}
      </div>
      <div className="flex gap-3 flex-wrap">
        <TopKBlock                            value={entry.data.retrievedTopK}    className="flex-1 min-w-0" />
        <JsonBlock label="Composer picks"    value={entry.data.composerPicks}    className="flex-1 min-w-0" />
        <JsonBlock label="Taxonomy snapshot" value={entry.data.taxonomySnapshot} className="flex-1 min-w-0" />
      </div>
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'text-amber-400' : 'text-gray-300'}>★</span>
      ))}
    </span>
  );
}

function FeedbackCard({ entry, offsetLabel }: { entry: Extract<TimelineEntry, { kind: 'feedback' }>; offsetLabel: string }) {
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 flex items-start gap-2 flex-wrap">
      <span className="text-xs text-gray-400 w-14 shrink-0" title={formatAbsoluteDate(entry.ts)}>
        {offsetLabel}
      </span>
      <StarRating value={entry.data.rating} />
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-200 text-purple-800">
        {entry.data.source}
      </span>
      {entry.data.isAddressed && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          addressed
        </span>
      )}
      {entry.data.note && (
        <span className="text-xs text-gray-700 italic">"{entry.data.note}"</span>
      )}
      <span className="ml-auto text-xs text-gray-400">feedback #{entry.data.id}</span>
    </div>
  );
}

function TimelineEntryCard({
  entry,
  startTs,
  previousUserMessage,
  turnEntries,
}: {
  entry: TimelineEntry;
  startTs: string;
  previousUserMessage?: string | null;
  turnEntries?: TurnEntry[];
}) {
  const offsetLabel = formatOffsetMs(startTs, entry.ts);
  const hasError =
    entry.kind === 'llm_call' && !!entry.data.errorType;
  const leftBorder = hasError ? 'border-l-4 border-l-red-500' : '';

  return (
    <div className={`${leftBorder}`}>
      {entry.kind === 'event'     && <EventCard     entry={entry} offsetLabel={offsetLabel} previousUserMessage={previousUserMessage} turnEntries={turnEntries} />}
      {entry.kind === 'llm_call'  && <LlmCallCard   entry={entry} offsetLabel={offsetLabel} />}
      {entry.kind === 'retrieval' && <RetrievalCard entry={entry} offsetLabel={offsetLabel} />}
      {entry.kind === 'feedback'  && <FeedbackCard  entry={entry} offsetLabel={offsetLabel} />}
    </div>
  );
}

/**
 * Convert a single TimelineEntry into the lightweight TurnEntry pill
 * shape (kind + label + payload).
 */
function toTurnEntry(entry: TimelineEntry): TurnEntry | null {
  if (entry.kind === 'retrieval') {
    return {
      kind: 'retrieval',
      label: `retrieval — "${entry.data.queryText}"`,
      value: entry.data,
    };
  }
  if (entry.kind === 'llm_call') {
    const tokens =
      entry.data.inputTokens != null || entry.data.outputTokens != null
        ? ` · ${entry.data.inputTokens ?? '?'}→${entry.data.outputTokens ?? '?'} tok`
        : '';
    const cost = entry.data.costUsd != null ? ` · ${formatCost(entry.data.costUsd)}` : '';
    return {
      kind: 'llm_call',
      label: `${entry.data.caller} (${entry.data.model})${tokens}${cost}`,
      value: entry.data,
    };
  }
  if (entry.kind === 'event') {
    if (entry.data.eventType === 'user_message' || entry.data.eventType === 'bot_reply') {
      return null;
    }
    return {
      kind: 'event',
      label: entry.data.eventType,
      value: entry.data,
    };
  }
  return null;
}

/**
 * For each bot_reply timeline index, collect the inter-turn entries
 * (everything between the prior bot_reply and this one, excluding the
 * user_message + the bot_reply itself).
 */
function computeTurnEntries(timeline: TimelineEntry[]): Array<TurnEntry[] | undefined> {
  const out: Array<TurnEntry[] | undefined> = new Array(timeline.length);
  let bucket: TurnEntry[] = [];
  for (let i = 0; i < timeline.length; i++) {
    const entry = timeline[i];
    if (entry.kind === 'event' && entry.data.eventType === 'bot_reply') {
      bucket.push({ kind: 'event', label: 'bot_reply', value: entry.data });
      out[i] = bucket;
      bucket = [];
      continue;
    }
    const turnEntry = toTurnEntry(entry);
    if (turnEntry) bucket.push(turnEntry);
  }
  return out;
}

/**
 * For each timeline entry, compute the most-recent prior user_message text
 * (or null). Used to pair user messages with bot replies in the snapshot
 * preview modal.
 */
function computePreviousUserMessages(timeline: TimelineEntry[]): Array<string | null> {
  const out: Array<string | null> = [];
  let lastUserText: string | null = null;
  for (const entry of timeline) {
    out.push(lastUserText);
    if (entry.kind === 'event' && entry.data.eventType === 'user_message') {
      const t = extractUserMessageText(entry.data.payload);
      if (t !== null) lastUserText = t;
    }
  }
  return out;
}

/**
 * Walk the timeline and pair every bot_reply with the most-recent prior
 * user_message. Used to power the full-session preview modal.
 */
function extractSessionTurns(timeline: TimelineEntry[]): SessionTurn[] {
  const turns: SessionTurn[] = [];
  let lastUserText: string | null = null;
  let bucket: TurnEntry[] = [];
  for (const entry of timeline) {
    if (entry.kind === 'event') {
      const payload = entry.data.payload as unknown;
      if (entry.data.eventType === 'user_message') {
        const t = extractUserMessageText(payload);
        if (t !== null) lastUserText = t;
        continue;
      }
      if (entry.data.eventType === 'bot_reply') {
        const botResponse = extractBotResponse(payload);
        const botText =
          botResponse && typeof botResponse.message === 'string' ? botResponse.message : '';
        const rawBotParts =
          botResponse && 'parts' in botResponse ? botResponse.parts : null;
        const mealSessions = extractMealSessions(payload);
        bucket.push({ kind: 'event', label: 'bot_reply', value: entry.data });
        turns.push({
          userText: lastUserText,
          botText,
          rawBotParts,
          mealSessions,
          turnEntries: bucket,
        });
        lastUserText = null;
        bucket = [];
        continue;
      }
    }
    const turnEntry = toTurnEntry(entry);
    if (turnEntry) bucket.push(turnEntry);
  }
  return turns;
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function ChatbotSessionDetailView({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const [detail, setDetail]   = useState<ChatbotSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string>();
  const [copied, setCopied]   = useState(false);
  const [showFullSession, setShowFullSession] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    chatbotLogsService
      .getSession(sessionId)
      .then(setDetail)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load session'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 text-lg">Loading session…</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600 text-lg">{error ?? 'Session not found'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Back to list
        </button>
      </div>
    );
  }

  const { totals } = detail;
  const totalTokens = totals.inputTokens + totals.outputTokens;

  const llmEntries = detail.timeline.filter(
    (e): e is Extract<TimelineEntry, { kind: 'llm_call' }> => e.kind === 'llm_call',
  );
  const sessionCostBreakdown = llmEntries.reduce(
    (acc, e) => {
      const rates = MODEL_RATES[e.data.model];
      if (!rates) return acc;
      acc.inputCost += tokenCost(e.data.inputTokens ?? 0, rates.input);
      acc.outputCost += tokenCost(e.data.outputTokens ?? 0, rates.output);
      acc.thinkingCost += tokenCost(e.data.thinkingTokens ?? 0, rates.output);
      acc.thinkingTokens += e.data.thinkingTokens ?? 0;
      return acc;
    },
    { inputCost: 0, outputCost: 0, thinkingCost: 0, thinkingTokens: 0 },
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            title="Click to copy full session ID"
            className="font-mono text-sm text-gray-800 bg-white border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
          >
            {copied ? 'Copied!' : sessionId}
          </button>
          <StatusBadge status={detail.inferredStatus} />
        </div>
        <button
          onClick={() => setShowFullSession(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          View full conversation
        </button>
        <div className="ml-auto text-sm text-gray-500">
          <span>{formatAbsoluteDate(detail.firstSeenTs)}</span>
          <span className="mx-1">→</span>
          <span>{formatAbsoluteDate(detail.lastSeenTs)}</span>
        </div>
      </div>

      {showFullSession && (
        <FullSessionModal
          turns={extractSessionTurns(detail.timeline)}
          onClose={() => setShowFullSession(false)}
        />
      )}

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Total cost</p>
            <p className="text-lg font-bold text-emerald-700">
              {formatCost(totals.costUsd)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              in {formatCost(sessionCostBreakdown.inputCost)} · out {formatCost(sessionCostBreakdown.outputCost)}
              {sessionCostBreakdown.thinkingTokens > 0 && ` · think ${formatCost(sessionCostBreakdown.thinkingCost)}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Tokens (in / out / total)</p>
            <p className="text-lg font-bold text-gray-900">
              {totals.inputTokens.toLocaleString()} / {totals.outputTokens.toLocaleString()} / {totalTokens.toLocaleString()}
            </p>
            {sessionCostBreakdown.thinkingTokens > 0 && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                + {sessionCostBreakdown.thinkingTokens.toLocaleString()} thinking
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Total latency</p>
            <p className="text-lg font-bold text-gray-900">{formatLatency(totals.latencyMs)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Events / LLM / Retrievals / Feedback</p>
            <p className="text-lg font-bold text-gray-900">
              {totals.eventCount} / {totals.llmCallCount} / {totals.retrievalCount} / {totals.feedbackCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Errors</p>
            <p className={`text-lg font-bold ${totals.errorCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {totals.errorCount}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Timeline ({detail.timeline.length} entries)
        </h2>
        {detail.timeline.length === 0 ? (
          <p className="text-gray-400 text-sm">No timeline entries.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(() => {
              const prevUserMessages = computePreviousUserMessages(detail.timeline);
              const turnEntriesByIndex = computeTurnEntries(detail.timeline);
              return detail.timeline.map((entry, i) => (
                <TimelineEntryCard
                  key={i}
                  entry={entry}
                  startTs={detail.firstSeenTs}
                  previousUserMessage={prevUserMessages[i]}
                  turnEntries={turnEntriesByIndex[i]}
                />
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List view ───────────────────────────────────────────────────────────────

const DATE_PRESETS: { label: string; value: string }[] = [
  { label: 'Last 24h',  value: '24h' },
  { label: 'Last 7d',   value: '7d' },
  { label: 'Last 30d',  value: '30d' },
  { label: 'All time',  value: 'all' },
];

function sinceIsoFromPreset(preset: string): string | undefined {
  if (preset === 'all') return undefined;
  const now = Date.now();
  if (preset === '24h')  return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (preset === '7d')   return new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString();
  if (preset === '30d')  return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  return undefined;
}

const STATUS_FILTERS = [
  { label: 'All',       value: '' },
  { label: 'Active',    value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Abandoned', value: 'abandoned' },
  { label: 'Errored',   value: 'errored' },
] as const;

type ChartMetric = 'cost' | 'tokens';

type CostItem = CostsResponse['items'][number];

const EMPTY_ITEM: Omit<CostItem, 'period'> = {
  totalCostUsd: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalThinkingTokens: 0,
  inputCostUsd: 0,
  outputCostUsd: 0,
  thinkingCostUsd: 0,
  callCount: 0,
  sessionCount: 0,
};

type Period = 'hourly' | 'daily' | 'monthly';

function fillGaps(items: CostItem[], period: Period, days: number): CostItem[] {
  // Key precision varies by bucket: 13 chars for hourly ('YYYY-MM-DDTHH'),
  // 10 chars for daily/monthly ('YYYY-MM-DD' / 'YYYY-MM-01').
  const keyLen = period === 'hourly' ? 13 : 10;
  const byKey = new Map<string, CostItem>();
  for (const item of items) byKey.set(item.period.slice(0, keyLen), item);

  const filled: CostItem[] = [];
  const now = new Date();

  if (period === 'hourly') {
    // 24 hours per day of `days`. Capped at 168 (1 week) so the chart
    // stays readable.
    const hours = Math.min(days * 24, 168);
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
        now.getUTCHours() - i,
      ));
      const key = d.toISOString().slice(0, 13);
      filled.push(byKey.get(key) ?? { ...EMPTY_ITEM, period: d.toISOString() });
    }
  } else if (period === 'daily') {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().slice(0, 10);
      filled.push(byKey.get(key) ?? { ...EMPTY_ITEM, period: d.toISOString() });
    }
  } else {
    const months = Math.min(Math.ceil(days / 30), 12);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 10);
      filled.push(byKey.get(key) ?? { ...EMPTY_ITEM, period: d.toISOString() });
    }
  }
  return filled;
}

function formatDateLabel(iso: string, mode: Period): string {
  const d = new Date(iso);
  if (mode === 'monthly') {
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }
  if (mode === 'hourly') {
    // "14:00" — compact for an hourly axis. The bucket span is implicit.
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function UsageLineChart({
  items,
  metric,
  period,
}: {
  items: CostsResponse['items'];
  metric: ChartMetric;
  period: Period;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ idx: number; mouseX: number; mouseY: number } | null>(null);

  const chartH = 160;
  const padL = 4;
  const padR = 4;
  const padTop = 12;
  const padBot = 28;

  const getValue = (item: CostsResponse['items'][number]) =>
    metric === 'cost'
      ? item.totalCostUsd
      : item.totalInputTokens + item.totalOutputTokens + item.totalThinkingTokens;

  const values = items.map(getValue);
  const maxVal = Math.max(...values, metric === 'cost' ? 0.001 : 1);

  const svgW = 800;
  const plotW = svgW - padL - padR;
  const plotH = chartH - padTop - padBot;

  const points = items.map((item, i) => {
    const x = padL + (items.length === 1 ? plotW / 2 : (i / (items.length - 1)) * plotW);
    const y = padTop + plotH - (getValue(item) / maxVal) * plotH;
    return { x, y, item, idx: i };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const baseline = padTop + plotH;
  const areaPath = points.length > 0
    ? `M ${points[0].x},${baseline} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${baseline} Z`
    : '';

  const lineColor = metric === 'cost' ? '#059669' : '#6366f1';
  const fillColor = metric === 'cost' ? '#d1fae580' : '#e0e7ff80';
  const dotColor = metric === 'cost' ? '#047857' : '#4f46e5';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgX = (e.clientX - ctm.e) / ctm.a;

    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - svgX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    setHover({ idx: closest, mouseX: e.clientX, mouseY: e.clientY });
  };

  const hoverItem = hover ? items[hover.idx] : null;
  const hoverPoint = hover ? points[hover.idx] : null;

  const labelIndices: number[] = [];
  if (items.length <= 10) {
    items.forEach((_, i) => labelIndices.push(i));
  } else {
    const step = Math.ceil(items.length / 8);
    for (let i = 0; i < items.length; i += step) labelIndices.push(i);
    if (labelIndices[labelIndices.length - 1] !== items.length - 1) labelIndices.push(items.length - 1);
  }

  return (
    <div className="relative" ref={containerRef}>
      <svg
        viewBox={`0 0 ${svgW} ${chartH}`}
        className="w-full"
        style={{ height: chartH }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padL} x2={svgW - padR}
            y1={padTop + plotH - frac * plotH}
            y2={padTop + plotH - frac * plotH}
            stroke="#f3f4f6" strokeWidth="1"
          />
        ))}
        <line
          x1={padL} x2={svgW - padR}
          y1={baseline} y2={baseline}
          stroke="#e5e7eb" strokeWidth="1"
        />

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={fillColor} />}

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p) => (
          <circle
            key={p.idx}
            cx={p.x} cy={p.y} r={hover?.idx === p.idx ? 5 : 3}
            fill={hover?.idx === p.idx ? dotColor : lineColor}
            stroke="white" strokeWidth="1.5"
          />
        ))}

        {/* Hover crosshair */}
        {hoverPoint && (
          <line
            x1={hoverPoint.x} x2={hoverPoint.x}
            y1={padTop} y2={baseline}
            stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 3"
          />
        )}

        {/* X-axis labels */}
        {labelIndices.map((i) => (
          <text
            key={i}
            x={points[i].x}
            y={chartH - 4}
            textAnchor="middle"
            className="fill-gray-400"
            style={{ fontSize: 10 }}
          >
            {formatDateLabel(items[i].period, period)}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hover && hoverItem && (() => {
        const totalTok = hoverItem.totalInputTokens + hoverItem.totalOutputTokens + hoverItem.totalThinkingTokens;
        const leftPct = (hoverPoint!.x / svgW) * 100;
        const clampedLeft = Math.max(12, Math.min(88, leftPct));
        return (
          <div
            className="absolute z-10 pointer-events-none bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 text-xs w-56"
            style={{
              left: `${clampedLeft}%`,
              bottom: `calc(100% + 8px)`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-semibold text-sm mb-2">{formatDateLabel(hoverItem.period, period)}</p>

            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left font-normal pb-1"></th>
                  <th className="text-right font-normal pb-1">Tokens</th>
                  <th className="text-right font-normal pb-1">Cost</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                <tr>
                  <td className="pr-2">Input</td>
                  <td className="text-right tabular-nums">{hoverItem.totalInputTokens.toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300">{formatCost(hoverItem.inputCostUsd)}</td>
                </tr>
                <tr>
                  <td className="pr-2">Output</td>
                  <td className="text-right tabular-nums">{hoverItem.totalOutputTokens.toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300">{formatCost(hoverItem.outputCostUsd)}</td>
                </tr>
                {hoverItem.totalThinkingTokens > 0 && (
                  <tr>
                    <td className="pr-2">Thinking</td>
                    <td className="text-right tabular-nums">{hoverItem.totalThinkingTokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-300">{formatCost(hoverItem.thinkingCostUsd)}</td>
                  </tr>
                )}
                <tr className="border-t border-gray-700">
                  <td className="pr-2 pt-1 font-semibold">Total</td>
                  <td className="text-right pt-1 font-semibold tabular-nums">{totalTok.toLocaleString()}</td>
                  <td className="text-right pt-1 font-semibold tabular-nums text-emerald-300">{formatCost(hoverItem.totalCostUsd)}</td>
                </tr>
                {hoverItem.sessionCount > 0 && (
                  <tr className="text-gray-400">
                    <td className="pr-2 pt-1">Avg/session</td>
                    <td className="text-right pt-1 tabular-nums">{Math.round(totalTok / hoverItem.sessionCount).toLocaleString()}</td>
                    <td className="text-right pt-1 tabular-nums">{formatCost(hoverItem.totalCostUsd / hoverItem.sessionCount)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="text-gray-400 mt-2 text-[10px]">{hoverItem.sessionCount} sessions · {hoverItem.callCount} calls</p>
          </div>
        );
      })()}
    </div>
  );
}

function CostOverview() {
  const [costs, setCosts] = useState<CostsResponse | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [metric, setMetric] = useState<ChartMetric>('cost');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Window scales with bucket granularity to keep the chart legible:
    // hourly → last 24h, daily → last 30d, monthly → last 12mo.
    const days = period === 'hourly' ? 1 : period === 'monthly' ? 365 : 30;
    chatbotLogsService
      .getCosts({ period, days })
      .then(setCosts)
      .catch(() => setCosts(null))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="text-gray-400 text-sm">Loading costs...</div>
      </div>
    );
  }

  if (!costs || costs.items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="text-gray-400 text-sm">No cost data yet.</div>
      </div>
    );
  }

  const totalTokens = costs.items.reduce(
    (s, i) => s + i.totalInputTokens + i.totalOutputTokens + i.totalThinkingTokens,
    0,
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Gemini Usage</h2>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-2xl font-bold text-emerald-700">{formatCost(costs.totalCostUsd)}</p>
            <p className="text-sm text-gray-500">{totalTokens.toLocaleString()} tokens</p>
          </div>
          <p className="text-xs text-gray-400">
            {(costs.totalSessions ?? 0).toLocaleString()} sessions · {costs.totalCalls.toLocaleString()} calls · {costs.days}d
          </p>
          {(costs.totalSessions ?? 0) > 0 && (
            <p className="text-xs text-gray-400">
              avg {formatCost(costs.totalCostUsd / costs.totalSessions)}/session · {(costs.totalCalls / costs.totalSessions).toFixed(1)} calls/session · {Math.round(totalTokens / costs.totalSessions).toLocaleString()} tokens/session
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-1">
            {(['hourly', 'daily', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  period === p
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p === 'hourly' ? 'Hourly' : p === 'daily' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {([
              { key: 'cost' as const, label: 'Cost' },
              { key: 'tokens' as const, label: 'Tokens' },
            ]).map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  metric === m.key
                    ? m.key === 'cost' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <UsageLineChart items={fillGaps(costs.items, period, costs.days)} metric={metric} period={period} />
    </div>
  );
}

function ChatbotSessionsListView({ onSelect }: { onSelect: (id: string) => void }) {
  const [items, setItems]           = useState<ChatbotSessionSummary[]>([]);
  const [total, setTotal]           = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState<string>();
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'completed' | 'abandoned' | 'errored'>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ]   = useState('');
  const [datePreset, setDatePreset]   = useState('all');
  const [sortBy, setSortBy]           = useState<'lastSeen' | 'created' | 'cost'>('created');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(searchInput), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchSessions = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) setLoadingMore(true);
    else { setLoading(true); setItems([]); }
    setError(undefined);

    try {
      const params: Parameters<typeof chatbotLogsService.listSessions>[0] = { limit: 12 };
      if (statusFilter)  params.status = statusFilter;
      if (debouncedQ)    params.q      = debouncedQ;
      const since = sinceIsoFromPreset(datePreset);
      if (since)         params.since  = since;
      if (cursor)        params.cursor = cursor;

      const res = await chatbotLogsService.listSessions(params);
      setTotal(res.total);
      setNextCursor(res.nextCursor);
      setItems(prev => isLoadMore ? [...prev, ...res.items] : res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter, debouncedQ, datePreset]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Infinite scroll: auto-load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchSessions(nextCursor);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, loading, loadingMore, fetchSessions]);

  type SortCol = 'lastSeen' | 'created' | 'cost';

  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      if (sortBy === 'cost') return (a.totalCostUsd ?? 0) - (b.totalCostUsd ?? 0);
      const tsA = sortBy === 'lastSeen' ? a.lastSeenTs : a.firstSeenTs;
      const tsB = sortBy === 'lastSeen' ? b.lastSeenTs : b.firstSeenTs;
      return new Date(tsA).getTime() - new Date(tsB).getTime();
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [items, sortBy, sortDir]);

  const handleSort = (col: SortCol) => {
    if (sortBy === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const SortIndicator = ({ col }: { col: SortCol }) => {
    if (sortBy !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Chatbot Sessions</h1>
        {!loading && (
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{items.length}</span>{' '}
            of <span className="font-semibold text-gray-700">{total}</span>
          </p>
        )}
      </div>

      <CostOverview />

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
        {/* Status chips */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search session ID prefix…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900 placeholder-gray-400"
        />

        {/* Date preset */}
        <select
          value={datePreset}
          onChange={e => setDatePreset(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-gray-900"
        >
          {DATE_PRESETS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="text-gray-400 text-base">Loading sessions…</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Session ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 transition-colors" onClick={() => handleSort('created')}>
                    Created<SortIndicator col="created" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 transition-colors" onClick={() => handleSort('lastSeen')}>
                    Last seen<SortIndicator col="lastSeen" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Events / LLM / Retrieval / Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Errors</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 transition-colors" onClick={() => handleSort('cost')}>
                    Cost<SortIndicator col="cost" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tokens in/out</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-gray-400 text-sm">
                      No sessions found.
                    </td>
                  </tr>
                )}
                {sortedItems.map(item => (
                  <tr
                    key={item.sessionId}
                    onClick={() => onSelect(item.sessionId)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={item.inferredStatus} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-sm text-blue-600 hover:text-blue-800"
                          title={item.sessionId}
                        >
                          {shortId(item.sessionId)}
                        </span>
                        {item.openFeedbackCount > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700"
                            title={`${item.openFeedbackCount} open issue(s)`}
                          >
                            ⚑ {item.openFeedbackCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{formatAbsoluteDate(item.firstSeenTs)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{formatRelativeTime(item.lastSeenTs)}</div>
                      <div className="text-xs text-gray-400">{formatAbsoluteDate(item.lastSeenTs)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {item.eventCount} / {item.llmCallCount} / {item.retrievalCount} / {item.feedbackCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.errorCount > 0 ? (
                        <span className="text-sm font-bold text-red-600">{item.errorCount}</span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-emerald-700">
                      {formatCost(item.totalCostUsd)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {item.totalInputTokens.toLocaleString()} / {item.totalOutputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {formatLatency(item.totalLatencyMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Infinite scroll sentinel */}
          {nextCursor && (
            <div
              ref={sentinelRef}
              className="px-6 py-4 border-t border-gray-100 flex justify-center text-sm text-gray-400"
            >
              {loadingMore ? 'Loading more…' : ' '}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Root screen ─────────────────────────────────────────────────────────────

const ChatbotLogsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const handleSelect = (id: string) => {
    setSearchParams({ sessionId: id });
  };

  const handleBack = () => {
    setSearchParams({});
  };

  if (sessionIdParam) {
    return (
      <ChatbotSessionDetailView
        sessionId={sessionIdParam}
        onBack={handleBack}
      />
    );
  }

  return <ChatbotSessionsListView onSelect={handleSelect} />;
};

export default ChatbotLogsScreen;
