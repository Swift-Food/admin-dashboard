import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import chatbotLogsService from '../../services/chatbot-logs.service';
import type {
  ChatbotSessionSummary,
  ChatbotSessionDetail,
  TimelineEntry,
  CostsResponse,
  CostBucket,
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

// ─── Pipeline_v1 payload extraction ─────────────────────────────────────────
// bot_reply events now carry pipeline_variant + stages_run + early_exit +
// pro_cart_fallback_fired alongside the existing response. These helpers
// pull them out defensively (legacy rows don't have them).

type PipelineMeta = {
  variant: 'legacy' | 'pipeline_v1' | null;
  stagesRun: string[] | null;
  earlyExit: string | null;
  proCartFallbackFired: boolean;
  turnId: string | null;
};

function extractPipelineMeta(payload: unknown): PipelineMeta {
  const empty: PipelineMeta = {
    variant: null, stagesRun: null, earlyExit: null,
    proCartFallbackFired: false, turnId: null,
  };
  if (!payload || typeof payload !== 'object') return empty;
  const p = payload as Record<string, unknown>;
  const variant = p.pipeline_variant;
  const stages = p.stages_run;
  return {
    variant: variant === 'legacy' || variant === 'pipeline_v1' ? variant : null,
    stagesRun: Array.isArray(stages) ? stages.filter((s) => typeof s === 'string') : null,
    earlyExit: typeof p.early_exit === 'string' ? p.early_exit : null,
    proCartFallbackFired: p.pro_cart_fallback_fired === true,
    turnId: typeof p.turn_id === 'string' ? p.turn_id : null,
  };
}

/** Caller value → variant. Pipeline_v1 callers are prefixed `pipeline_v1.`;
 *  legacy chat used `chat_tool_calling` historically and `tool_calling_loop`
 *  after the variant-switch rename — both map to legacy. Anything else is 'other'. */
function callerToVariant(caller: string | null | undefined): 'legacy' | 'pipeline_v1' | 'other' {
  if (!caller) return 'other';
  if (caller.startsWith('pipeline_v1.')) return 'pipeline_v1';
  if (caller === 'tool_calling_loop' || caller === 'chat_tool_calling') return 'legacy';
  return 'other';
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

type FeedbackTimelineEntry = Extract<TimelineEntry, { kind: 'feedback' }>;

function InlineFeedback({ feedback, startTs, highlightId, highlightRef, onToggleAddressed }: {
  feedback: FeedbackTimelineEntry[];
  startTs: string;
  highlightId?: string | null;
  highlightRef?: React.RefObject<HTMLDivElement | null>;
  onToggleAddressed?: (feedbackId: number, isAddressed: boolean) => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleToggle = async (fb: FeedbackTimelineEntry) => {
    if (!onToggleAddressed) return;
    setBusyId(fb.data.id);
    try {
      await chatbotLogsService.updateFeedback(String(fb.data.id), { isAddressed: !fb.data.isAddressed });
      onToggleAddressed(fb.data.id, !fb.data.isAddressed);
    } catch {
      // ignore
    } finally {
      setBusyId(null);
    }
  };

  if (feedback.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {feedback.map((fb) => {
        const isHighlighted = !!(highlightId && String(fb.data.id) === highlightId);
        return (
          <div
            key={fb.data.id}
            ref={isHighlighted ? highlightRef : undefined}
            className={`rounded-md border border-purple-200 bg-purple-50 px-3 py-2 flex items-center gap-2 flex-wrap ${
              isHighlighted ? 'ring-2 ring-purple-400 ring-offset-1' : ''
            }`}
          >
            <StarRating value={fb.data.rating} />
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-200 text-purple-800">
              {fb.data.source}
            </span>
            {fb.data.isAddressed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                addressed
              </span>
            )}
            {fb.data.note && (
              <span className="text-xs text-gray-700 italic">"{fb.data.note}"</span>
            )}
            <span className="ml-auto text-xs text-gray-400">
              {formatOffsetMs(startTs, fb.ts)}
            </span>
            <button
              onClick={() => handleToggle(fb)}
              disabled={busyId === fb.data.id}
              className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors disabled:opacity-50 ${
                fb.data.isAddressed
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {busyId === fb.data.id ? '…' : fb.data.isAddressed ? 'Reopen' : 'Mark done'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function FeedbackOverviewRow({
  fb,
  isGeneral,
  userMsg,
  isHighlighted,
  highlightRef,
  startTs,
  onScrollTo,
  onToggleAddressed,
}: {
  fb: FeedbackTimelineEntry;
  isGeneral: boolean;
  userMsg: string | null;
  isHighlighted: boolean;
  highlightRef?: React.RefObject<HTMLDivElement | null>;
  startTs: string;
  onScrollTo?: () => void;
  onToggleAddressed: (feedbackId: number, isAddressed: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      await chatbotLogsService.updateFeedback(String(fb.data.id), { isAddressed: !fb.data.isAddressed });
      onToggleAddressed(fb.data.id, !fb.data.isAddressed);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={highlightRef}
      onClick={onScrollTo}
      className={`rounded-md border px-3 py-2 flex items-center gap-2 flex-wrap transition-colors ${
        isGeneral
          ? 'border-purple-200 bg-purple-50'
          : 'border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100'
      } ${isHighlighted ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}
    >
      <StarRating value={fb.data.rating} />
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-200 text-purple-800">
        {fb.data.source}
      </span>
      {isGeneral && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600">
          general
        </span>
      )}
      {fb.data.isAddressed && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
          addressed
        </span>
      )}
      {fb.data.note && (
        <span className="text-xs text-gray-700 italic">&ldquo;{fb.data.note}&rdquo;</span>
      )}
      {userMsg && (
        <span className="text-xs text-gray-500 truncate max-w-[200px]" title={userMsg}>
          &rarr; &ldquo;{userMsg}&rdquo;
        </span>
      )}
      <span className="ml-auto flex items-center gap-2 text-xs text-gray-400">
        {formatOffsetMs(startTs, fb.ts)}
        {onScrollTo && (
          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
      <button
        onClick={handleToggle}
        disabled={busy}
        className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors disabled:opacity-50 ${
          fb.data.isAddressed
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {busy ? '…' : fb.data.isAddressed ? 'Reopen' : 'Mark done'}
      </button>
    </div>
  );
}

function EventCard({
  entry,
  offsetLabel,
  previousUserMessage,
  turnEntries,
  attachedFeedback,
  startTs,
  highlightFeedbackId,
  highlightRef,
  onToggleAddressed,
}: {
  entry: Extract<TimelineEntry, { kind: 'event' }>;
  offsetLabel: string;
  previousUserMessage?: string | null;
  turnEntries?: TurnEntry[];
  attachedFeedback?: FeedbackTimelineEntry[];
  startTs?: string;
  highlightFeedbackId?: string | null;
  highlightRef?: React.RefObject<HTMLDivElement | null>;
  onToggleAddressed?: (feedbackId: number, isAddressed: boolean) => void;
}) {
  const isUser  = entry.data.eventType === 'user_message';
  const isBot   = entry.data.eventType === 'bot_reply';
  const tint    = isUser ? 'border-blue-300 bg-blue-50' : isBot ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white';

  const payload = entry.data.payload as unknown;
  const userMessageText = isUser ? extractUserMessageText(payload) : null;
  const pipelineMeta = isBot ? extractPipelineMeta(payload) : null;

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
      {pipelineMeta && (pipelineMeta.variant || pipelineMeta.stagesRun || pipelineMeta.earlyExit) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          {pipelineMeta.variant && (
            <span
              className={`px-1.5 py-0.5 rounded font-mono ${
                pipelineMeta.variant === 'pipeline_v1'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}
              title="pipeline_variant on bot_reply"
            >
              {pipelineMeta.variant}
            </span>
          )}
          {pipelineMeta.stagesRun && pipelineMeta.stagesRun.length > 0 && (
            <span className="font-mono text-gray-700">
              {pipelineMeta.stagesRun.join(' → ')}
            </span>
          )}
          {pipelineMeta.earlyExit && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono">
              early_exit: {pipelineMeta.earlyExit}
            </span>
          )}
          {pipelineMeta.proCartFallbackFired && (
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-mono">
              pro_cart_fallback
            </span>
          )}
          {pipelineMeta.turnId && (
            <span className="text-gray-400 font-mono" title={pipelineMeta.turnId}>
              turn {pipelineMeta.turnId.slice(0, 8)}
            </span>
          )}
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

      {isBot && attachedFeedback && attachedFeedback.length > 0 && startTs && (
        <InlineFeedback
          feedback={attachedFeedback}
          startTs={startTs}
          highlightId={highlightFeedbackId}
          highlightRef={highlightRef}
          onToggleAddressed={onToggleAddressed}
        />
      )}
    </div>
  );
}

function LlmCallCard({ entry, offsetLabel }: { entry: Extract<TimelineEntry, { kind: 'llm_call' }>; offsetLabel: string }) {
  const hasError = !!entry.data.errorType;
  const variant  = callerToVariant(entry.data.caller);
  // Tint the card subtly by variant so a multi-row pipeline_v1 turn reads
  // as a single visual group when scrolling through the timeline.
  const variantBorder = hasError
    ? 'border-l-4 border-l-red-500 border-t border-r border-b border-red-200 bg-red-50'
    : variant === 'pipeline_v1'
      ? 'border border-emerald-200 bg-emerald-50'
      : variant === 'legacy'
        ? 'border border-slate-200 bg-slate-50'
        : 'border border-indigo-200 bg-indigo-50';

  return (
    <div className={`rounded-lg ${variantBorder} p-3`}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs text-gray-400 w-14 shrink-0" title={formatAbsoluteDate(entry.ts)}>
          {offsetLabel}
        </span>
        {variant !== 'other' && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              variant === 'pipeline_v1'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}
            title={variant === 'pipeline_v1' ? 'pipeline_v1.* caller' : 'legacy tool_calling_loop'}
          >
            {variant}
          </span>
        )}
        <span className="font-bold text-sm text-indigo-800">{entry.data.caller}</span>
        <span className="text-xs text-indigo-500">{entry.data.model}</span>
        {entry.data.latencyMs != null && (
          <span className="text-xs text-gray-500">{formatLatency(entry.data.latencyMs)}</span>
        )}
        <span className="ml-auto text-xs text-gray-400">llm #{entry.data.id}</span>
      </div>
      {(entry.data.inputTokens != null || entry.data.outputTokens != null) && (
        <div className="text-xs text-gray-600 mb-1">
          <span>{entry.data.inputTokens ?? '?'} in</span>
          {entry.data.inputCostUsd != null && <span className="text-emerald-600"> ({formatCost(entry.data.inputCostUsd)})</span>}
          {entry.data.cachedInputTokens ? (
            <span className="text-sky-600"> · {entry.data.cachedInputTokens.toLocaleString()} cached</span>
          ) : null}
          <span> · {entry.data.outputTokens ?? '?'} out</span>
          {entry.data.outputCostUsd != null && <span className="text-emerald-600"> ({formatCost(entry.data.outputCostUsd)})</span>}
          {entry.data.thinkingTokens ? (
            <>
              <span> · {entry.data.thinkingTokens} thinking</span>
              {entry.data.thinkingCostUsd != null && <span className="text-emerald-600"> ({formatCost(entry.data.thinkingCostUsd)})</span>}
            </>
          ) : null}
          {entry.data.costUsd != null && (
            <span className="ml-2 font-semibold text-emerald-700">= {formatCost(entry.data.costUsd)}</span>
          )}
          {entry.data.turnId && (
            <span className="ml-2 text-gray-400" title={entry.data.turnId}>turn {entry.data.turnId.slice(0, 8)}</span>
          )}
        </div>
      )}
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

const TimelineEntryCard = React.forwardRef<
  HTMLDivElement,
  {
    entry: TimelineEntry;
    startTs: string;
    previousUserMessage?: string | null;
    turnEntries?: TurnEntry[];
    highlight?: boolean;
    attachedFeedback?: FeedbackTimelineEntry[];
    highlightFeedbackId?: string | null;
    feedbackHighlightRef?: React.RefObject<HTMLDivElement | null>;
    onToggleAddressed?: (feedbackId: number, isAddressed: boolean) => void;
  }
>(function TimelineEntryCard({ entry, startTs, previousUserMessage, turnEntries, highlight, attachedFeedback, highlightFeedbackId, feedbackHighlightRef, onToggleAddressed }, ref) {
  const offsetLabel = formatOffsetMs(startTs, entry.ts);
  const hasError =
    entry.kind === 'llm_call' && !!entry.data.errorType;
  const leftBorder = hasError ? 'border-l-4 border-l-red-500' : '';
  const highlightRing = highlight ? 'ring-2 ring-purple-400 ring-offset-2 rounded-lg' : '';

  return (
    <div ref={ref} className={`${leftBorder} ${highlightRing}`}>
      {entry.kind === 'event'     && <EventCard entry={entry} offsetLabel={offsetLabel} previousUserMessage={previousUserMessage} turnEntries={turnEntries} attachedFeedback={attachedFeedback} startTs={startTs} highlightFeedbackId={highlightFeedbackId} highlightRef={feedbackHighlightRef} onToggleAddressed={onToggleAddressed} />}
      {entry.kind === 'llm_call'  && <LlmCallCard   entry={entry} offsetLabel={offsetLabel} />}
      {entry.kind === 'retrieval' && <RetrievalCard entry={entry} offsetLabel={offsetLabel} />}
    </div>
  );
});

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
function extractSessionTurns(
  timeline: TimelineEntry[],
  feedbackByEventId?: Map<number, FeedbackTimelineEntry[]>,
): SessionTurn[] {
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
        const fb = feedbackByEventId?.get(entry.data.id) ?? [];
        turns.push({
          userText: lastUserText,
          botText,
          rawBotParts,
          mealSessions,
          turnEntries: bucket,
          feedback: fb.map(f => ({
            id: f.data.id,
            rating: f.data.rating,
            note: f.data.note,
            source: f.data.source,
            isAddressed: f.data.isAddressed,
          })),
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
  highlightFeedbackId,
}: {
  sessionId: string;
  onBack: () => void;
  highlightFeedbackId?: string | null;
}) {
  const [detail, setDetail]   = useState<ChatbotSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string>();
  const [copied, setCopied]   = useState(false);
  const [showFullSession, setShowFullSession] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const timelineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(null);

  const scrollToEvent = useCallback((eventId: number) => {
    const el = timelineRefs.current.get(eventId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedEventId(eventId);
      setTimeout(() => setHighlightedEventId(null), 2000);
    }
  }, []);

  const handleToggleFeedback = useCallback((feedbackId: number, isAddressed: boolean) => {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        timeline: prev.timeline.map((e) =>
          e.kind === 'feedback' && e.data.id === feedbackId
            ? { ...e, data: { ...e.data, isAddressed, addressedAt: isAddressed ? new Date().toISOString() : null } }
            : e,
        ),
      };
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    chatbotLogsService
      .getSession(sessionId)
      .then(setDetail)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load session'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (highlightFeedbackId && detail && !hasScrolled.current && highlightRef.current) {
      hasScrolled.current = true;
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightFeedbackId, detail]);

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

  const allFeedback = detail.timeline.filter(
    (e): e is FeedbackTimelineEntry => e.kind === 'feedback',
  );
  const feedbackByEventId = new Map<number, FeedbackTimelineEntry[]>();
  const generalFeedback: FeedbackTimelineEntry[] = [];
  for (const fb of allFeedback) {
    if (fb.data.botReplyEventId != null) {
      const arr = feedbackByEventId.get(fb.data.botReplyEventId);
      if (arr) arr.push(fb);
      else feedbackByEventId.set(fb.data.botReplyEventId, [fb]);
    } else {
      generalFeedback.push(fb);
    }
  }

  const userMessageByBotReplyId = (() => {
    const map = new Map<number, string>();
    let lastUserText: string | null = null;
    for (const entry of detail.timeline) {
      if (entry.kind === 'event' && entry.data.eventType === 'user_message') {
        const t = extractUserMessageText(entry.data.payload);
        if (t !== null) lastUserText = t;
      }
      if (entry.kind === 'event' && entry.data.eventType === 'bot_reply' && lastUserText) {
        map.set(entry.data.id, lastUserText);
      }
    }
    return map;
  })();

  const timelineWithoutFeedback = detail.timeline.filter((e) => e.kind !== 'feedback');

  const llmEntries = detail.timeline.filter(
    (e): e is Extract<TimelineEntry, { kind: 'llm_call' }> => e.kind === 'llm_call',
  );
  // Costs are pre-computed per call by the backend (shared pricing table), so
  // we just sum them — no FE-side rate math that could drift. inputCostUsd
  // already includes the cache discount; cachedInputCostUsd is its 25% portion.
  const sessionCostBreakdown = llmEntries.reduce(
    (acc, e) => {
      acc.uncachedInputCost += (e.data.inputCostUsd ?? 0) - (e.data.cachedInputCostUsd ?? 0);
      acc.cachedInputCost += e.data.cachedInputCostUsd ?? 0;
      acc.outputCost += e.data.outputCostUsd ?? 0;
      acc.thinkingCost += e.data.thinkingCostUsd ?? 0;
      acc.thinkingTokens += e.data.thinkingTokens ?? 0;
      acc.cachedInputTokens += e.data.cachedInputTokens ?? 0;
      return acc;
    },
    {
      uncachedInputCost: 0, cachedInputCost: 0, outputCost: 0,
      thinkingCost: 0, thinkingTokens: 0, cachedInputTokens: 0,
    },
  );
  const sessionInputCost =
    sessionCostBreakdown.uncachedInputCost + sessionCostBreakdown.cachedInputCost;

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
          turns={extractSessionTurns(detail.timeline, feedbackByEventId)}
          generalFeedback={generalFeedback.map(fb => ({
            id: fb.data.id,
            rating: fb.data.rating,
            note: fb.data.note,
            source: fb.data.source,
            isAddressed: fb.data.isAddressed,
          }))}
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
              in {formatCost(sessionInputCost)} · out {formatCost(sessionCostBreakdown.outputCost)}
              {sessionCostBreakdown.thinkingTokens > 0 && ` · think ${formatCost(sessionCostBreakdown.thinkingCost)}`}
            </p>
            {sessionCostBreakdown.cachedInputTokens > 0 && (
              <p className="text-[11px] text-sky-600 mt-0.5">
                input: {formatCost(sessionCostBreakdown.uncachedInputCost)} live + {formatCost(sessionCostBreakdown.cachedInputCost)} cached
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Tokens (in / out / total)</p>
            <p className="text-lg font-bold text-gray-900">
              {totals.inputTokens.toLocaleString()} / {totals.outputTokens.toLocaleString()} / {totalTokens.toLocaleString()}
            </p>
            {sessionCostBreakdown.cachedInputTokens > 0 && totals.inputTokens > 0 && (
              <p className="text-[11px] text-sky-600 mt-0.5">
                {sessionCostBreakdown.cachedInputTokens.toLocaleString()} of input cached ({Math.round((sessionCostBreakdown.cachedInputTokens / totals.inputTokens) * 100)}%)
              </p>
            )}
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

      {/* Feedback overview */}
      {allFeedback.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Feedback ({allFeedback.length})
          </h2>
          <div className="flex flex-col gap-1.5">
            {allFeedback.map((fb) => {
              const isGeneral = fb.data.botReplyEventId == null;
              const userMsg = fb.data.botReplyEventId != null
                ? userMessageByBotReplyId.get(fb.data.botReplyEventId) ?? null
                : null;
              const isHighlighted = !!(highlightFeedbackId && String(fb.data.id) === highlightFeedbackId);
              return (
                <FeedbackOverviewRow
                  key={fb.data.id}
                  fb={fb}
                  isGeneral={isGeneral}
                  userMsg={userMsg}
                  isHighlighted={isHighlighted}
                  highlightRef={isHighlighted ? highlightRef : undefined}
                  startTs={detail.firstSeenTs}
                  onScrollTo={!isGeneral && fb.data.botReplyEventId != null ? () => scrollToEvent(fb.data.botReplyEventId!) : undefined}
                  onToggleAddressed={handleToggleFeedback}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Timeline ({timelineWithoutFeedback.length} entries)
        </h2>
        {timelineWithoutFeedback.length === 0 ? (
          <p className="text-gray-400 text-sm">No timeline entries.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(() => {
              const prevUserMessages = computePreviousUserMessages(timelineWithoutFeedback);
              const turnEntriesByIndex = computeTurnEntries(timelineWithoutFeedback);
              return timelineWithoutFeedback.map((entry, i) => {
                const eventId = entry.kind === 'event' ? entry.data.id : undefined;
                const attached = eventId != null ? feedbackByEventId.get(eventId) : undefined;
                return (
                  <TimelineEntryCard
                    key={i}
                    ref={(el: HTMLDivElement | null) => {
                      if (el && eventId != null) timelineRefs.current.set(eventId, el);
                    }}
                    entry={entry}
                    startTs={detail.firstSeenTs}
                    previousUserMessage={prevUserMessages[i]}
                    turnEntries={turnEntriesByIndex[i]}
                    highlight={eventId != null && eventId === highlightedEventId}
                    attachedFeedback={attached}
                    onToggleAddressed={handleToggleFeedback}
                  />
                );
              });
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

/** Shared palette so chart, tooltip, and card table all colour the two
 *  pipelines identically. slate = legacy (pre-refactor), emerald = pipeline_v1
 *  (the cheaper Flash pipeline we're rolling out). */
const VARIANT_COLORS = {
  legacy:      { line: '#64748b', dot: '#475569', text: 'text-slate-600' },
  pipeline_v1: { line: '#059669', dot: '#047857', text: 'text-emerald-600' },
} as const;

/** Empty CostBucket used when a variant has no rows in a given period. Lets
 *  the table/tooltip render zeros instead of branching on undefined. */
const EMPTY_BUCKET: CostBucket = {
  totalCostUsd: 0,
  totalInputTokens: 0,
  totalCachedInputTokens: 0,
  totalOutputTokens: 0,
  totalThinkingTokens: 0,
  inputCostUsd: 0,
  cachedInputCostUsd: 0,
  outputCostUsd: 0,
  thinkingCostUsd: 0,
  callCount: 0,
  turnCount: 0,
};

const bucketTokens = (b: CostBucket): number =>
  b.totalInputTokens + b.totalOutputTokens + b.totalThinkingTokens;

const EMPTY_ITEM: Omit<CostItem, 'period'> = {
  totalCostUsd: 0,
  totalInputTokens: 0,
  totalCachedInputTokens: 0,
  totalOutputTokens: 0,
  totalThinkingTokens: 0,
  inputCostUsd: 0,
  cachedInputCostUsd: 0,
  outputCostUsd: 0,
  thinkingCostUsd: 0,
  callCount: 0,
  turnCount: 0,
  sessionCount: 0,
  byVariant: {},
};

type Period = 'hourly' | 'daily' | 'weekly' | 'monthly';

/** Merge two byVariant maps element-wise. Used by the weekly aggregator
 *  when collapsing daily buckets into weeks. */
function mergeByVariant(
  a: CostItem['byVariant'],
  b: CostItem['byVariant'],
): CostItem['byVariant'] {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]) as Set<keyof CostItem['byVariant']>;
  const out: CostItem['byVariant'] = {};
  for (const k of keys) {
    const av = a?.[k];
    const bv = b?.[k];
    if (!av) { out[k] = bv; continue; }
    if (!bv) { out[k] = av; continue; }
    out[k] = {
      totalCostUsd: av.totalCostUsd + bv.totalCostUsd,
      totalInputTokens: av.totalInputTokens + bv.totalInputTokens,
      totalCachedInputTokens: av.totalCachedInputTokens + bv.totalCachedInputTokens,
      totalOutputTokens: av.totalOutputTokens + bv.totalOutputTokens,
      totalThinkingTokens: av.totalThinkingTokens + bv.totalThinkingTokens,
      inputCostUsd: av.inputCostUsd + bv.inputCostUsd,
      cachedInputCostUsd: av.cachedInputCostUsd + bv.cachedInputCostUsd,
      outputCostUsd: av.outputCostUsd + bv.outputCostUsd,
      thinkingCostUsd: av.thinkingCostUsd + bv.thinkingCostUsd,
      callCount: av.callCount + bv.callCount,
      turnCount: av.turnCount + bv.turnCount,
    };
  }
  return out;
}

function getWeekStart(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
}

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
  } else if (period === 'weekly') {
    const weeklyMap = new Map<string, CostItem>();
    for (const item of items) {
      const ws = getWeekStart(new Date(item.period));
      const key = ws.toISOString().slice(0, 10);
      const existing = weeklyMap.get(key);
      if (existing) {
        weeklyMap.set(key, {
          period: ws.toISOString(),
          totalCostUsd: existing.totalCostUsd + item.totalCostUsd,
          totalInputTokens: existing.totalInputTokens + item.totalInputTokens,
          totalCachedInputTokens: existing.totalCachedInputTokens + item.totalCachedInputTokens,
          totalOutputTokens: existing.totalOutputTokens + item.totalOutputTokens,
          totalThinkingTokens: existing.totalThinkingTokens + item.totalThinkingTokens,
          inputCostUsd: existing.inputCostUsd + item.inputCostUsd,
          cachedInputCostUsd: existing.cachedInputCostUsd + item.cachedInputCostUsd,
          outputCostUsd: existing.outputCostUsd + item.outputCostUsd,
          thinkingCostUsd: existing.thinkingCostUsd + item.thinkingCostUsd,
          callCount: existing.callCount + item.callCount,
          turnCount: existing.turnCount + item.turnCount,
          sessionCount: existing.sessionCount + item.sessionCount,
          byVariant: mergeByVariant(existing.byVariant, item.byVariant),
        });
      } else {
        weeklyMap.set(key, { ...item, period: ws.toISOString() });
      }
    }
    const weeks = Math.ceil(days / 7);
    const nowWS = getWeekStart(now);
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(Date.UTC(nowWS.getUTCFullYear(), nowWS.getUTCMonth(), nowWS.getUTCDate() - i * 7));
      const key = ws.toISOString().slice(0, 10);
      filled.push(weeklyMap.get(key) ?? { ...EMPTY_ITEM, period: ws.toISOString() });
    }
  } else {
    const months = Math.ceil(days / 30);
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
  selectedIdx,
  onSelect,
}: {
  items: CostsResponse['items'];
  metric: ChartMetric;
  period: Period;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ idx: number; mouseX: number; mouseY: number } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [items, period]);

  const chartH = 160;
  const padL = 30;
  const padR = 30;
  const padTop = 12;
  const padBot = 28;

  /** Per-variant value for the selected metric. Missing variant in a period
   *  reads as zero — the byVariant map only includes rows that exist. */
  const variantValue = (b: CostBucket | undefined) => {
    if (!b) return 0;
    return metric === 'cost' ? b.totalCostUsd : bucketTokens(b);
  };

  const legacyVals = items.map((it) => variantValue(it.byVariant.legacy));
  const v1Vals     = items.map((it) => variantValue(it.byVariant.pipeline_v1));
  // Shared Y axis so the two lines stay directly comparable. Clamp to a tiny
  // positive floor so a fully-zero window still has a sensible scale.
  const maxVal = Math.max(...legacyVals, ...v1Vals, metric === 'cost' ? 0.001 : 1);

  const pointSpacing = period === 'hourly' ? 30 : period === 'daily' ? 40 : period === 'weekly' ? 60 : 80;
  const minW = 800;
  const svgW = Math.max(minW, padL + padR + (items.length - 1) * pointSpacing);
  const plotW = svgW - padL - padR;
  const plotH = chartH - padTop - padBot;

  const xs = items.map((_, i) =>
    padL + (items.length === 1 ? plotW / 2 : (i / (items.length - 1)) * plotW),
  );
  const yOf = (v: number) => padTop + plotH - (v / maxVal) * plotH;
  const baseline = padTop + plotH;

  const legacyPoints = items.map((_, i) => ({ x: xs[i], y: yOf(legacyVals[i]) }));
  const v1Points     = items.map((_, i) => ({ x: xs[i], y: yOf(v1Vals[i]) }));
  const legacyPolyline = legacyPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const v1Polyline     = v1Points.map((p) => `${p.x},${p.y}`).join(' ');

  const closestIdxFromSvgX = (svgX: number) => {
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const dist = Math.abs(xs[i] - svgX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    return closest;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgX = (e.clientX - ctm.e) / ctm.a;
    setHover({ idx: closestIdxFromSvgX(svgX), mouseX: e.clientX, mouseY: e.clientY });
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgX = (e.clientX - ctm.e) / ctm.a;
    onSelect(closestIdxFromSvgX(svgX));
  };

  const hoverItem = hover ? items[hover.idx] : null;
  const hoverX    = hover ? xs[hover.idx] : null;

  const labelIndices: number[] = [];
  const minLabelGap = 60;
  let lastLabelX = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] - lastLabelX >= minLabelGap) {
      labelIndices.push(i);
      lastLabelX = xs[i];
    }
  }

  const legacyC = VARIANT_COLORS.legacy;
  const v1C     = VARIANT_COLORS.pipeline_v1;

  return (
    <div className="relative" ref={containerRef}>
      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mb-1 text-[10px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: legacyC.line }} />
          legacy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: v1C.line }} />
          pipeline_v1
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
      <svg
        viewBox={`0 0 ${svgW} ${chartH}`}
        className="cursor-pointer"
        style={{ height: chartH, width: svgW, minWidth: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
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

        {/* Legacy line */}
        <polyline
          points={legacyPolyline}
          fill="none"
          stroke={legacyC.line}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* pipeline_v1 line */}
        <polyline
          points={v1Polyline}
          fill="none"
          stroke={v1C.line}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points — one dot per variant per bucket */}
        {items.map((_, idx) => {
          const isSelected = idx === selectedIdx;
          const isHovered  = hover?.idx === idx;
          const r = isHovered ? 5 : isSelected ? 5 : 3;
          return (
            <g key={idx}>
              {isSelected && (
                <>
                  <circle cx={legacyPoints[idx].x} cy={legacyPoints[idx].y} r={8} fill="none" stroke={legacyC.dot} strokeWidth="2" opacity={0.3} />
                  <circle cx={v1Points[idx].x}     cy={v1Points[idx].y}     r={8} fill="none" stroke={v1C.dot}     strokeWidth="2" opacity={0.3} />
                </>
              )}
              <circle
                cx={legacyPoints[idx].x} cy={legacyPoints[idx].y}
                r={r}
                fill={isHovered || isSelected ? legacyC.dot : legacyC.line}
                stroke="white" strokeWidth="1.5"
              />
              <circle
                cx={v1Points[idx].x} cy={v1Points[idx].y}
                r={r}
                fill={isHovered || isSelected ? v1C.dot : v1C.line}
                stroke="white" strokeWidth="1.5"
              />
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hoverX != null && (
          <line
            x1={hoverX} x2={hoverX}
            y1={padTop} y2={baseline}
            stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 3"
          />
        )}

        {/* X-axis labels */}
        {labelIndices.map((i) => (
          <text
            key={i}
            x={xs[i]}
            y={chartH - 4}
            textAnchor="middle"
            className="fill-gray-400"
            style={{ fontSize: 10 }}
          >
            {formatDateLabel(items[i].period, period)}
          </text>
        ))}
      </svg>
      </div>

      {/* Tooltip — per-pipeline breakdown of Input/Output/Thinking for the hovered bucket. */}
      {hover && hoverItem && hoverX != null && scrollRef.current && containerRef.current && (() => {
        const legacy = hoverItem.byVariant.legacy     ?? EMPTY_BUCKET;
        const v1     = hoverItem.byVariant.pipeline_v1 ?? EMPTY_BUCKET;
        const totalTok = hoverItem.totalInputTokens + hoverItem.totalOutputTokens + hoverItem.totalThinkingTokens;
        const anyCached   = legacy.totalCachedInputTokens > 0 || v1.totalCachedInputTokens > 0;
        const anyThinking = legacy.totalThinkingTokens > 0 || v1.totalThinkingTokens > 0;
        const liveInput = (b: CostBucket) => b.totalInputTokens - b.totalCachedInputTokens;
        const liveCost  = (b: CostBucket) => b.inputCostUsd - b.cachedInputCostUsd;
        const lCpt = legacy.turnCount > 0 ? legacy.totalCostUsd / legacy.turnCount : null;
        const vCpt = v1.turnCount     > 0 ? v1.totalCostUsd     / v1.turnCount     : null;
        // The tooltip is taller than the chart, so anchor it to the cursor with
        // fixed (viewport-relative) positioning and flip it below the cursor when
        // there isn't room above. Keeps it fully visible regardless of how short
        // the surrounding card is.
        const TOOLTIP_W = 320; // matches w-80
        const ESTIMATED_H = 340;
        const cursorX = hover!.mouseX;
        const cursorY = hover!.mouseY;
        const placeBelow = cursorY < ESTIMATED_H + 16;
        const clampedLeft = Math.max(
          TOOLTIP_W / 2 + 8,
          Math.min(window.innerWidth - TOOLTIP_W / 2 - 8, cursorX),
        );
        return (
          <div
            className="fixed z-50 pointer-events-none bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 text-[11px] w-80"
            style={{
              left: clampedLeft,
              top: placeBelow ? cursorY + 16 : cursorY - 12,
              transform: placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            }}
          >
            <p className="font-semibold text-sm mb-2">
              {period === 'weekly' ? (() => {
                const start = new Date(hoverItem.period);
                const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
                const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                return `${fmt(start)} – ${fmt(end)}`;
              })() : formatDateLabel(hoverItem.period, period)}
            </p>

            <table className="w-full">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left font-normal pb-0.5"></th>
                  <th colSpan={2} className="font-normal pb-0.5 border-l border-gray-700">
                    <span className="inline-flex items-center gap-1 px-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ background: legacyC.line }} />
                      legacy
                    </span>
                  </th>
                  <th colSpan={2} className="font-normal pb-0.5 border-l border-gray-700">
                    <span className="inline-flex items-center gap-1 px-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ background: v1C.line }} />
                      pipeline_v1
                    </span>
                  </th>
                </tr>
                <tr className="text-gray-400 text-[10px]">
                  <th className="text-left font-normal pb-1"></th>
                  <th className="text-right font-normal pb-1 pl-1 border-l border-gray-700">Tokens</th>
                  <th className="text-right font-normal pb-1">Cost</th>
                  <th className="text-right font-normal pb-1 pl-1 border-l border-gray-700">Tokens</th>
                  <th className="text-right font-normal pb-1">Cost</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                <tr>
                  <td className="pr-2">Input (live)</td>
                  <td className="text-right tabular-nums pl-1 border-l border-gray-700">{liveInput(legacy).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300">{formatCost(liveCost(legacy))}</td>
                  <td className="text-right tabular-nums pl-1 border-l border-gray-700">{liveInput(v1).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300">{formatCost(liveCost(v1))}</td>
                </tr>
                {anyCached && (
                  <tr className="text-sky-300">
                    <td className="pr-2">Input (cached)</td>
                    <td className="text-right tabular-nums pl-1 border-l border-gray-700">{legacy.totalCachedInputTokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{formatCost(legacy.cachedInputCostUsd)}</td>
                    <td className="text-right tabular-nums pl-1 border-l border-gray-700">{v1.totalCachedInputTokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{formatCost(v1.cachedInputCostUsd)}</td>
                  </tr>
                )}
                <tr>
                  <td className="pr-2">Output</td>
                  <td className="text-right tabular-nums pl-1 border-l border-gray-700">{legacy.totalOutputTokens.toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300">{formatCost(legacy.outputCostUsd)}</td>
                  <td className="text-right tabular-nums pl-1 border-l border-gray-700">{v1.totalOutputTokens.toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300">{formatCost(v1.outputCostUsd)}</td>
                </tr>
                {anyThinking && (
                  <tr>
                    <td className="pr-2">Thinking</td>
                    <td className="text-right tabular-nums pl-1 border-l border-gray-700">{legacy.totalThinkingTokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-300">{formatCost(legacy.thinkingCostUsd)}</td>
                    <td className="text-right tabular-nums pl-1 border-l border-gray-700">{v1.totalThinkingTokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-300">{formatCost(v1.thinkingCostUsd)}</td>
                  </tr>
                )}
                <tr className="border-t border-gray-700 font-semibold">
                  <td className="pr-2 pt-1">Total</td>
                  <td className="text-right tabular-nums pl-1 pt-1 border-l border-gray-700">{bucketTokens(legacy).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300 pt-1">{formatCost(legacy.totalCostUsd)}</td>
                  <td className="text-right tabular-nums pl-1 pt-1 border-l border-gray-700">{bucketTokens(v1).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-emerald-300 pt-1">{formatCost(v1.totalCostUsd)}</td>
                </tr>
                <tr>
                  <td className="pr-2 pt-1">Calls</td>
                  <td colSpan={2} className="text-center tabular-nums pl-1 pt-1 border-l border-gray-700">{legacy.callCount.toLocaleString()}</td>
                  <td colSpan={2} className="text-center tabular-nums pl-1 pt-1 border-l border-gray-700">{v1.callCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="pr-2 pt-1">Turns</td>
                  <td colSpan={2} className="text-center tabular-nums pl-1 pt-1 border-l border-gray-700">{legacy.turnCount.toLocaleString()}</td>
                  <td colSpan={2} className="text-center tabular-nums pl-1 pt-1 border-l border-gray-700">{v1.turnCount.toLocaleString()}</td>
                </tr>
                {hoverItem.sessionCount > 0 && (
                  <tr className="text-gray-400">
                    <td className="pr-2 pt-1">Avg/session</td>
                    <td className="text-right tabular-nums pl-1 pt-1 border-l border-gray-700">{Math.round(bucketTokens(legacy) / hoverItem.sessionCount).toLocaleString()}</td>
                    <td className="text-right tabular-nums pt-1">{formatCost(legacy.totalCostUsd / hoverItem.sessionCount)}</td>
                    <td className="text-right tabular-nums pl-1 pt-1 border-l border-gray-700">{Math.round(bucketTokens(v1) / hoverItem.sessionCount).toLocaleString()}</td>
                    <td className="text-right tabular-nums pt-1">{formatCost(v1.totalCostUsd / hoverItem.sessionCount)}</td>
                  </tr>
                )}
                <tr className="text-gray-400">
                  <td className="pr-2 pt-1">Cost/turn</td>
                  <td colSpan={2} className="text-center tabular-nums text-emerald-300 pl-1 pt-1 border-l border-gray-700">{lCpt != null ? formatCost(lCpt) : '—'}</td>
                  <td colSpan={2} className="text-center tabular-nums text-emerald-300 pl-1 pt-1 border-l border-gray-700">{vCpt != null ? formatCost(vCpt) : '—'}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-gray-400 mt-2 text-[10px]">
              bucket total {totalTok.toLocaleString()} tokens · {formatCost(hoverItem.totalCostUsd)} · {hoverItem.sessionCount} sessions · {hoverItem.callCount} calls
            </p>
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
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedIdx(null);
    const apiPeriod: 'hourly' | 'daily' | 'monthly' = period === 'weekly' ? 'daily' : period;
    const days = period === 'hourly' ? 7 : period === 'weekly' ? 365 : period === 'monthly' ? 730 : 365;
    chatbotLogsService
      .getCosts({ period: apiPeriod, days })
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

  const filledItems = fillGaps(costs.items, period, costs.days);
  const activeIdx = selectedIdx ?? filledItems.length - 1;
  const activeItem = filledItems[activeIdx];
  const activeTokens = activeItem
    ? activeItem.totalInputTokens + activeItem.totalOutputTokens + activeItem.totalThinkingTokens
    : 0;
  const activeCost = activeItem?.totalCostUsd ?? 0;
  const activeSessions = activeItem?.sessionCount ?? 0;
  const activeCalls = activeItem?.callCount ?? 0;

  const isDefault = selectedIdx === null || selectedIdx === filledItems.length - 1;
  const defaultLabels: Record<Period, string> = {
    hourly: 'This hour', daily: 'Today', weekly: 'This week', monthly: 'This month',
  };
  const periodLabel = isDefault || !activeItem
    ? defaultLabels[period]
    : period === 'weekly'
      ? (() => {
          const start = new Date(activeItem.period);
          const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
          const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return `${fmt(start)} – ${fmt(end)}`;
        })()
      : formatDateLabel(activeItem.period, period);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Gemini Usage</h2>
            <div className="flex items-baseline gap-3 mt-1">
              <p className="text-2xl font-bold text-emerald-700">{formatCost(activeCost)}</p>
              <p className="text-sm text-gray-500">{activeTokens.toLocaleString()} tokens</p>
              <p className="text-xs text-gray-400">{periodLabel}</p>
            </div>
            <p className="text-xs text-gray-400">
              {activeSessions.toLocaleString()} sessions · {activeCalls.toLocaleString()} calls
            </p>
            {activeSessions > 0 && (
              <p className="text-xs text-gray-400">
                avg {formatCost(activeCost / activeSessions)}/session · {(activeCalls / activeSessions).toFixed(1)} calls/session · {Math.round(activeTokens / activeSessions).toLocaleString()} tokens/session
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-1">
            {(['hourly', 'daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  period === p
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p === 'hourly' ? 'Hourly' : p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
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

      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <UsageLineChart items={filledItems} metric={metric} period={period} selectedIdx={activeIdx} onSelect={setSelectedIdx} />
        </div>
          {activeItem && (() => {
            const legacy = activeItem.byVariant.legacy     ?? EMPTY_BUCKET;
            const v1     = activeItem.byVariant.pipeline_v1 ?? EMPTY_BUCKET;
            const anyCached   = legacy.totalCachedInputTokens > 0 || v1.totalCachedInputTokens > 0;
            const anyThinking = legacy.totalThinkingTokens > 0 || v1.totalThinkingTokens > 0;
            const liveTok  = (b: CostBucket) => b.totalInputTokens - b.totalCachedInputTokens;
            const liveCost = (b: CostBucket) => b.inputCostUsd - b.cachedInputCostUsd;
            // Cost-per-turn — the rollout-critical comparison. Null when the
            // pipeline produced no turns in the selected period.
            const lCpt = legacy.turnCount > 0 ? legacy.totalCostUsd / legacy.turnCount : null;
            const vCpt = v1.turnCount     > 0 ? v1.totalCostUsd     / v1.turnCount     : null;
            return (
              <table className="text-[11px] text-gray-500 shrink-0">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left font-normal pb-0.5 pr-3"></th>
                    <th colSpan={2} className="font-normal pb-0.5 px-2 border-l border-gray-200">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: VARIANT_COLORS.legacy.line }} />
                        legacy
                      </span>
                    </th>
                    <th colSpan={2} className="font-normal pb-0.5 px-2 border-l border-gray-200">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: VARIANT_COLORS.pipeline_v1.line }} />
                        pipeline_v1
                      </span>
                    </th>
                  </tr>
                  <tr className="text-gray-400 text-[10px]">
                    <th className="text-left font-normal pb-0.5 pr-3"></th>
                    <th className="text-right font-normal pb-0.5 pl-2 pr-2 border-l border-gray-200">Tokens</th>
                    <th className="text-right font-normal pb-0.5 pr-2">Cost</th>
                    <th className="text-right font-normal pb-0.5 pl-2 pr-2 border-l border-gray-200">Tokens</th>
                    <th className="text-right font-normal pb-0.5 pr-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-3">Input (live)</td>
                    <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{liveTok(legacy).toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-600 pr-2">{formatCost(liveCost(legacy))}</td>
                    <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{liveTok(v1).toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-600 pr-2">{formatCost(liveCost(v1))}</td>
                  </tr>
                  {anyCached && (
                    <tr className="text-sky-600">
                      <td className="pr-3">Input (cached)</td>
                      <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{legacy.totalCachedInputTokens.toLocaleString()}</td>
                      <td className="text-right tabular-nums pr-2">{formatCost(legacy.cachedInputCostUsd)}</td>
                      <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{v1.totalCachedInputTokens.toLocaleString()}</td>
                      <td className="text-right tabular-nums pr-2">{formatCost(v1.cachedInputCostUsd)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="pr-3">Output</td>
                    <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{legacy.totalOutputTokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-600 pr-2">{formatCost(legacy.outputCostUsd)}</td>
                    <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{v1.totalOutputTokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-600 pr-2">{formatCost(v1.outputCostUsd)}</td>
                  </tr>
                  {anyThinking && (
                    <tr>
                      <td className="pr-3">Thinking</td>
                      <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{legacy.totalThinkingTokens.toLocaleString()}</td>
                      <td className="text-right tabular-nums text-emerald-600 pr-2">{formatCost(legacy.thinkingCostUsd)}</td>
                      <td className="text-right tabular-nums pl-2 pr-2 border-l border-gray-200">{v1.totalThinkingTokens.toLocaleString()}</td>
                      <td className="text-right tabular-nums text-emerald-600 pr-2">{formatCost(v1.thinkingCostUsd)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-200 font-semibold text-gray-700">
                    <td className="pr-3 pt-0.5">Total</td>
                    <td className="text-right tabular-nums pl-2 pr-2 pt-0.5 border-l border-gray-200">{bucketTokens(legacy).toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-700 pr-2 pt-0.5">{formatCost(legacy.totalCostUsd)}</td>
                    <td className="text-right tabular-nums pl-2 pr-2 pt-0.5 border-l border-gray-200">{bucketTokens(v1).toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-700 pr-2 pt-0.5">{formatCost(v1.totalCostUsd)}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 pt-0.5">Calls</td>
                    <td colSpan={2} className="text-center tabular-nums px-2 pt-0.5 border-l border-gray-200">{legacy.callCount.toLocaleString()}</td>
                    <td colSpan={2} className="text-center tabular-nums px-2 pt-0.5 border-l border-gray-200">{v1.callCount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 pt-0.5">Turns</td>
                    <td colSpan={2} className="text-center tabular-nums px-2 pt-0.5 border-l border-gray-200">{legacy.turnCount.toLocaleString()}</td>
                    <td colSpan={2} className="text-center tabular-nums px-2 pt-0.5 border-l border-gray-200">{v1.turnCount.toLocaleString()}</td>
                  </tr>
                  {activeSessions > 0 && (
                    <tr className="text-gray-400">
                      <td className="pr-3 pt-0.5">Avg/session</td>
                      <td className="text-right tabular-nums pl-2 pr-2 pt-0.5 border-l border-gray-200">{Math.round(bucketTokens(legacy) / activeSessions).toLocaleString()}</td>
                      <td className="text-right tabular-nums pr-2 pt-0.5">{formatCost(legacy.totalCostUsd / activeSessions)}</td>
                      <td className="text-right tabular-nums pl-2 pr-2 pt-0.5 border-l border-gray-200">{Math.round(bucketTokens(v1) / activeSessions).toLocaleString()}</td>
                      <td className="text-right tabular-nums pr-2 pt-0.5">{formatCost(v1.totalCostUsd / activeSessions)}</td>
                    </tr>
                  )}
                  <tr className="text-gray-400">
                    <td className="pr-3 pt-0.5">Cost/turn</td>
                    <td colSpan={2} className="text-center tabular-nums text-emerald-600 px-2 pt-0.5 border-l border-gray-200">{lCpt != null ? formatCost(lCpt) : '—'}</td>
                    <td colSpan={2} className="text-center tabular-nums text-emerald-600 px-2 pt-0.5 border-l border-gray-200">{vCpt != null ? formatCost(vCpt) : '—'}</td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
      </div>
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
  const feedbackIdParam = searchParams.get('feedbackId');

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
        highlightFeedbackId={feedbackIdParam}
      />
    );
  }

  return <ChatbotSessionsListView onSelect={handleSelect} />;
};

export default ChatbotLogsScreen;
