import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import chatbotLogsService from '../../services/chatbot-logs.service';
import type {
  ChatbotSessionSummary,
  ChatbotSessionDetail,
  TimelineEntry,
} from '../../types/chatbot-logs.types';

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

function shortId(sessionId: string): string {
  return sessionId.slice(0, 8) + '…';
}

function prettyJson(val: any): string {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
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

function EventCard({ entry, offsetLabel }: { entry: Extract<TimelineEntry, { kind: 'event' }>; offsetLabel: string }) {
  const isUser  = entry.data.eventType === 'user_message';
  const isBot   = entry.data.eventType === 'bot_reply';
  const tint    = isUser ? 'border-blue-300 bg-blue-50' : isBot ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white';

  return (
    <div className={`rounded-lg border ${tint} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400 w-14 shrink-0" title={formatAbsoluteDate(entry.ts)}>
          {offsetLabel}
        </span>
        <span className="font-semibold text-sm text-gray-800">{entry.data.eventType}</span>
        <span className="ml-auto text-xs text-gray-400">event #{entry.data.id}</span>
      </div>
      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">payload</summary>
        <pre className="mt-1 bg-gray-100 rounded p-2 whitespace-pre-wrap break-words text-xs leading-relaxed">
          {prettyJson(entry.data.payload)}
        </pre>
      </details>
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
      {(entry.data.inputTokens != null || entry.data.outputTokens != null) && (
        <p className="text-xs text-gray-600 mb-1">
          {entry.data.inputTokens ?? '?'} in · {entry.data.outputTokens ?? '?'} out
        </p>
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
        <details className="text-xs flex-1 min-w-0">
          <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">Prompt</summary>
          <pre className="mt-1 bg-white rounded border border-gray-200 p-2 whitespace-pre-wrap break-words text-xs leading-relaxed">
            {prettyJson(entry.data.prompt)}
          </pre>
        </details>
        <details className="text-xs flex-1 min-w-0">
          <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">Response</summary>
          <pre className="mt-1 bg-white rounded border border-gray-200 p-2 whitespace-pre-wrap break-words text-xs leading-relaxed">
            {prettyJson(entry.data.response)}
          </pre>
        </details>
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
        <details className="text-xs flex-1 min-w-0">
          <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">Retrieved top-K</summary>
          <pre className="mt-1 bg-white rounded border border-gray-200 p-2 whitespace-pre-wrap break-words text-xs leading-relaxed">
            {prettyJson(entry.data.retrievedTopK)}
          </pre>
        </details>
        <details className="text-xs flex-1 min-w-0">
          <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">Composer picks</summary>
          <pre className="mt-1 bg-white rounded border border-gray-200 p-2 whitespace-pre-wrap break-words text-xs leading-relaxed">
            {prettyJson(entry.data.composerPicks)}
          </pre>
        </details>
        <details className="text-xs flex-1 min-w-0">
          <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">Taxonomy snapshot</summary>
          <pre className="mt-1 bg-white rounded border border-gray-200 p-2 whitespace-pre-wrap break-words text-xs leading-relaxed">
            {prettyJson(entry.data.taxonomySnapshot)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function FeedbackCard({ entry, offsetLabel }: { entry: Extract<TimelineEntry, { kind: 'feedback' }>; offsetLabel: string }) {
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 flex items-start gap-2 flex-wrap">
      <span className="text-xs text-gray-400 w-14 shrink-0" title={formatAbsoluteDate(entry.ts)}>
        {offsetLabel}
      </span>
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-200 text-purple-800">
        {entry.data.kind}
      </span>
      {entry.data.reasonText && (
        <span className="text-xs text-gray-700 italic">"{entry.data.reasonText}"</span>
      )}
      {entry.data.reasonBuckets && entry.data.reasonBuckets.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {entry.data.reasonBuckets.map((b, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">{b}</span>
          ))}
        </div>
      )}
      <span className="ml-auto text-xs text-gray-400">feedback #{entry.data.id}</span>
    </div>
  );
}

function TimelineEntryCard({ entry, startTs }: { entry: TimelineEntry; startTs: string }) {
  const offsetLabel = formatOffsetMs(startTs, entry.ts);
  const hasError =
    entry.kind === 'llm_call' && !!entry.data.errorType;
  const leftBorder = hasError ? 'border-l-4 border-l-red-500' : '';

  return (
    <div className={`${leftBorder}`}>
      {entry.kind === 'event'     && <EventCard     entry={entry} offsetLabel={offsetLabel} />}
      {entry.kind === 'llm_call'  && <LlmCallCard   entry={entry} offsetLabel={offsetLabel} />}
      {entry.kind === 'retrieval' && <RetrievalCard entry={entry} offsetLabel={offsetLabel} />}
      {entry.kind === 'feedback'  && <FeedbackCard  entry={entry} offsetLabel={offsetLabel} />}
    </div>
  );
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
        <div className="ml-auto text-sm text-gray-500">
          <span>{formatAbsoluteDate(detail.firstSeenTs)}</span>
          <span className="mx-1">→</span>
          <span>{formatAbsoluteDate(detail.lastSeenTs)}</span>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Tokens (in / out / total)</p>
            <p className="text-lg font-bold text-gray-900">
              {totals.inputTokens.toLocaleString()} / {totals.outputTokens.toLocaleString()} / {totalTokens.toLocaleString()}
            </p>
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
            {detail.timeline.map((entry, i) => (
              <TimelineEntryCard key={i} entry={entry} startTs={detail.firstSeenTs} />
            ))}
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const params: Parameters<typeof chatbotLogsService.listSessions>[0] = { limit: 50 };
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

  const handleLoadMore = () => {
    if (nextCursor) fetchSessions(nextCursor);
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
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Last seen</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Events / LLM / Retrieval / FB</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Errors</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tokens in/out</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400 text-sm">
                      No sessions found.
                    </td>
                  </tr>
                )}
                {items.map(item => (
                  <tr
                    key={item.sessionId}
                    onClick={() => onSelect(item.sessionId)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={item.inferredStatus} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="font-mono text-sm text-blue-600 hover:text-blue-800"
                        title={item.sessionId}
                      >
                        {shortId(item.sessionId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{formatRelativeTime(item.lastSeenTs)}</div>
                      <div className="text-xs text-gray-400">{formatAbsoluteDate(item.firstSeenTs)}</div>
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

          {/* Load more */}
          {nextCursor && (
            <div className="px-6 py-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
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
