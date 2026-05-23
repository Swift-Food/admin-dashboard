import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import chatbotLogsService from '../services/chatbot-logs.service';
import type { ChatFeedbackItem } from '../types/chatbot-logs.types';

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

function shortId(sessionId: string): string {
  return sessionId.slice(0, 8) + '…';
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

type FeedbackFilter = 'open' | 'addressed' | 'all';

const FEEDBACK_FILTERS: { value: FeedbackFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'addressed', label: 'Addressed' },
  { value: 'all', label: 'All' },
];

export default function FeedbackIssuesScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChatFeedbackItem[]>([]);
  const [filter, setFilter] = useState<FeedbackFilter>('open');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchFeedback = useCallback(() => {
    setLoading(true);
    chatbotLogsService
      .listFeedback({ status: filter, limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const toggleAddressed = async (item: ChatFeedbackItem) => {
    setBusyId(item.id);
    try {
      await chatbotLogsService.updateFeedback(item.id, !item.isAddressed);
      setItems((prev) =>
        filter === 'all'
          ? prev.map((f) =>
              f.id === item.id ? { ...f, isAddressed: !f.isAddressed } : f,
            )
          : prev.filter((f) => f.id !== item.id),
      );
    } catch {
      // leave as-is; a refetch on filter change will reconcile
    } finally {
      setBusyId(null);
    }
  };

  const openFeedback = (item: ChatFeedbackItem) => {
    navigate(`/swift/chatbot-logs?sessionId=${item.sessionId}&feedbackId=${item.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Feedback &amp; Issues</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${items.length} ${filter === 'all' ? 'total' : filter}`}
          </p>
          <div className="flex gap-1">
            {FEEDBACK_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f.value
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && items.length === 0 && (
          <div className="text-gray-400 text-sm py-4 text-center">
            {filter === 'open' ? 'No open issues 🎉' : 'Nothing here.'}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => openFeedback(item)}
              className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <StarRating value={item.rating} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      item.source === 'internal'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {item.source}
                  </span>
                  <span className="font-mono text-xs text-indigo-600">
                    {shortId(item.sessionId)}
                  </span>
                  <span className="text-xs text-gray-400" title={formatAbsoluteDate(item.createdAt)}>
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
                {item.note && (
                  <p className="mt-1 text-sm text-gray-700 break-words">{item.note}</p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleAddressed(item); }}
                disabled={busyId === item.id}
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                  item.isAddressed
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {busyId === item.id
                  ? '…'
                  : item.isAddressed
                    ? 'Reopen'
                    : 'Mark done'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
