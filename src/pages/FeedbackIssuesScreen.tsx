import { useState, useEffect, useCallback, useMemo } from 'react';
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

function EditableStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(n); }}
          className={`text-lg leading-none transition-transform hover:scale-110 ${n <= value ? 'text-amber-400' : 'text-gray-300'}`}
          title={`Set rating to ${n}`}
        >
          ★
        </button>
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
  // Inline edit state — one row at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [ratingFilterMode, setRatingFilterMode] = useState<'only' | 'exclude'>('only');
  type SortKey = { field: 'rating' | 'date'; dir: 'asc' | 'desc' };
  const [sortKeys, setSortKeys] = useState<SortKey[]>([]);

  const sortRating = sortKeys.find((s) => s.field === 'rating')?.dir ?? null;
  const sortDate = sortKeys.find((s) => s.field === 'date')?.dir ?? null;
  const ratingPriority = sortKeys.findIndex((s) => s.field === 'rating');
  const datePriority = sortKeys.findIndex((s) => s.field === 'date');

  const toggleSort = (field: 'rating' | 'date') => {
    setSortKeys((prev) => {
      const existing = prev.find((s) => s.field === field);
      const others = prev.filter((s) => s.field !== field);
      if (!existing) return [...others, { field, dir: 'asc' as const }];
      if (existing.dir === 'asc') return [...others, { field, dir: 'desc' as const }];
      return others;
    });
  };

  const filteredItems = useMemo(() => {
    if (ratingFilter === null) return items;
    return items.filter((item) =>
      ratingFilterMode === 'only' ? item.rating === ratingFilter : item.rating !== ratingFilter,
    );
  }, [items, ratingFilter, ratingFilterMode]);

  const sortedItems = useMemo(() => {
    if (sortKeys.length === 0) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      for (const { field, dir } of sortKeys) {
        let cmp = 0;
        if (field === 'rating') cmp = a.rating - b.rating;
        else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredItems, sortKeys]);

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
      await chatbotLogsService.updateFeedback(item.id, { isAddressed: !item.isAddressed });
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

  const startEdit = (item: ChatFeedbackItem) => {
    setEditingId(item.id);
    setEditNote(item.note ?? '');
    setEditRating(item.rating);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote('');
  };

  const saveEdit = async (item: ChatFeedbackItem) => {
    setSavingId(item.id);
    const note = editNote.trim();
    try {
      await chatbotLogsService.updateFeedback(item.id, { note, rating: editRating });
      setItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, note, rating: editRating } : f)),
      );
      setEditingId(null);
    } catch {
      // leave editor open so the admin can retry
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Feedback &amp; Issues</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${sortedItems.length}${ratingFilter !== null ? ` of ${items.length}` : ''} ${filter === 'all' ? 'total' : filter}`}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRatingFilterMode((prev) => prev === 'only' ? 'exclude' : 'only')}
                className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                  ratingFilterMode === 'only'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                {ratingFilterMode === 'only' ? 'Only' : 'Exclude'}
              </button>
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRatingFilter((prev) => prev === r ? null : r)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                    ratingFilter === r
                      ? ratingFilterMode === 'only' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r}★
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Sort:</span>
              <button
                onClick={() => toggleSort('rating')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  sortRating
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sortKeys.length > 1 && ratingPriority >= 0 ? `${ratingPriority + 1}. ` : ''}Rating {sortRating === 'asc' ? '↑' : sortRating === 'desc' ? '↓' : ''}
              </button>
              <button
                onClick={() => toggleSort('date')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  sortDate
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sortKeys.length > 1 && datePriority >= 0 ? `${datePriority + 1}. ` : ''}Date {sortDate === 'desc' ? '↓' : sortDate === 'asc' ? '↑' : ''}
              </button>
              {sortKeys.length > 0 && (
                <button
                  onClick={() => setSortKeys([])}
                  className="px-2 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Clear all sorting"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
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
          {sortedItems.map((item) => {
            const isEditing = editingId === item.id;
            return (
            <div
              key={item.id}
              onClick={() => { if (!isEditing) openFeedback(item); }}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                isEditing
                  ? 'border-indigo-200 bg-white cursor-default'
                  : 'border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100'
              }`}
            >
              {isEditing ? (
                <EditableStars value={editRating} onChange={setEditRating} />
              ) : (
                <StarRating value={item.rating} />
              )}
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
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    {formatAbsoluteDate(item.createdAt)}
                  </span>
                </div>
                {isEditing ? (
                  <textarea
                    value={editNote}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Note / diagnosis…"
                    className="mt-2 w-full resize-y rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                ) : (
                  item.note && (
                    <p className="mt-1 text-sm text-gray-700 break-words whitespace-pre-wrap">{item.note}</p>
                  )
                )}
              </div>
              {isEditing ? (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); saveEdit(item); }}
                    disabled={savingId === item.id}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {savingId === item.id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                    disabled={savingId === item.id}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    title="Edit note / rating"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAddressed(item); }}
                    disabled={busyId === item.id}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
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
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
