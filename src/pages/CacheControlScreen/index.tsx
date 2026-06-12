import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, X } from "lucide-react";
import cacheControlService, {
  type CacheSectionMeta,
  type CacheStats,
} from "../../services/cache-control.service";
import "./CacheControlScreen.css";

type Toast = { type: "success" | "error"; text: string };

type Confirm =
  | { kind: "section"; section: CacheSectionMeta }
  | { kind: "all" }
  | null;

function extractError(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    // axios-style error
    const resp = (err as { response?: { data?: { message?: unknown } } }).response;
    const msg = resp?.data?.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg) && typeof msg[0] === "string") return msg[0];
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const CacheControlScreen: React.FC = () => {
  const [sections, setSections] = useState<CacheSectionMeta[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [clearingId, setClearingId] = useState<string | null>(null); // section id or "__all__"
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((next: Toast) => {
    setToast(next);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await cacheControlService.getStats());
    } catch (err) {
      showToast({ type: "error", text: extractError(err, "Failed to load cache stats.") });
    } finally {
      setStatsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    cacheControlService
      .getSections()
      .then((res) => {
        if (active) setSections(res);
      })
      .catch((err) => {
        if (active)
          showToast({ type: "error", text: extractError(err, "Failed to load cache sections.") });
      })
      .finally(() => active && setLoading(false));
    loadStats();
    return () => {
      active = false;
    };
  }, [loadStats, showToast]);

  // Preserve the registry's group ordering as sections arrive.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, CacheSectionMeta[]>();
    for (const s of sections) {
      if (!byGroup.has(s.group)) {
        byGroup.set(s.group, []);
        order.push(s.group);
      }
      byGroup.get(s.group)!.push(s);
    }
    return order.map((g) => ({ group: g, items: byGroup.get(g)! }));
  }, [sections]);

  const countFor = (id: string): number | null =>
    stats ? stats.sections[id] ?? 0 : null;

  const handleClearSection = async (section: CacheSectionMeta) => {
    setClearingId(section.id);
    try {
      const res = await cacheControlService.clearSection(section.id);
      showToast({
        type: "success",
        text: `${section.label}: cleared ${res.clearedCount} key${res.clearedCount === 1 ? "" : "s"}.`,
      });
      await loadStats();
    } catch (err) {
      showToast({ type: "error", text: extractError(err, "Failed to clear cache.") });
    } finally {
      setClearingId(null);
      setConfirm(null);
    }
  };

  const handleClearAll = async () => {
    setClearingId("__all__");
    try {
      const res = await cacheControlService.clearAll();
      showToast({
        type: "success",
        text: `Cleared all caches — ${res.totalCleared} key${res.totalCleared === 1 ? "" : "s"} removed.`,
      });
      await loadStats();
    } catch (err) {
      showToast({ type: "error", text: extractError(err, "Failed to clear all caches.") });
    } finally {
      setClearingId(null);
      setConfirm(null);
    }
  };

  const modalBusy = clearingId !== null;

  return (
    <div className="cache-control">
      <h1 className="cache-control__title">Cache Control</h1>
      <p className="cache-control__subtitle">
        Clear backend caches by section. Every cache here is a read-through cache — clearing it
        only forces a fresh recompute or refetch on the next request. Operational state (login
        sessions, locks, payout scheduling) is deliberately not touchable from this panel.
      </p>

      {/* Stats bar */}
      <div className="cache-control__statsbar">
        <div className="cache-stat">
          <span className="cache-stat__value">
            {statsLoading ? "…" : stats?.totalKeys.toLocaleString() ?? "—"}
          </span>
          <span className="cache-stat__label">Total Redis keys</span>
        </div>
        <div className="cache-stat">
          <span className="cache-stat__value">
            {statsLoading ? "…" : stats?.usedMemoryHuman ?? "—"}
          </span>
          <span className="cache-stat__label">Memory used</span>
        </div>
        <div className="cache-control__statsbar-spacer" />
        <button
          className="cache-btn cache-btn--ghost"
          onClick={loadStats}
          disabled={statsLoading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={15} />
          {statsLoading ? "Refreshing…" : "Refresh counts"}
        </button>
        <button
          className="cache-btn cache-btn--danger"
          onClick={() => setConfirm({ kind: "all" })}
          disabled={loading || modalBusy}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Trash2 size={15} />
          Clear all caches
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading cache sections…</p>
      ) : (
        groups.map(({ group, items }) => (
          <section key={group} className="cache-group">
            <h2 className="cache-group__title">{group}</h2>
            <div className="cache-group__grid">
              {items.map((section) => {
                const count = countFor(section.id);
                const busy = clearingId === section.id;
                return (
                  <div
                    key={section.id}
                    className={
                      "cache-card" + (section.disruptive ? " cache-card--disruptive" : "")
                    }
                  >
                    <div className="cache-card__head">
                      <span className="cache-card__label">{section.label}</span>
                      <span
                        className={
                          "cache-card__count" +
                          (count === 0 ? " cache-card__count--empty" : "")
                        }
                      >
                        {count === null ? "…" : `${count.toLocaleString()} key${count === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <p className="cache-card__desc">{section.description}</p>
                    {section.disruptive && (
                      <span className="cache-card__warn">
                        <AlertTriangle size={13} /> Disrupts active users
                      </span>
                    )}
                    <div className="cache-card__foot">
                      <button
                        className="cache-btn cache-btn--clear"
                        onClick={() => setConfirm({ kind: "section", section })}
                        disabled={modalBusy}
                      >
                        {busy ? "Clearing…" : "Clear"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="cache-modal__overlay" onClick={() => !modalBusy && setConfirm(null)}>
          <div className="cache-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cache-modal__header">
              <h2>
                {confirm.kind === "all"
                  ? "Clear all caches?"
                  : `Clear "${confirm.section.label}"?`}
              </h2>
              <button
                className="cache-modal__close"
                onClick={() => !modalBusy && setConfirm(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="cache-modal__body">
              {confirm.kind === "all" ? (
                <p>
                  This clears <strong>every</strong> cache section listed on this page. Each one
                  repopulates on the next request, so the main effect is a brief spike in
                  cold-cache latency. Login sessions, locks and payout state are not affected.
                </p>
              ) : (
                <p>{confirm.section.description}</p>
              )}

              {((confirm.kind === "section" && confirm.section.disruptive) ||
                confirm.kind === "all") && (
                <div className="cache-modal__warn">
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    {confirm.kind === "all"
                      ? "Includes catering chat sessions — active chat users will lose their conversation and have to start over."
                      : "Active chat users will lose their conversation and have to start over."}
                  </span>
                </div>
              )}
            </div>

            <div className="cache-modal__actions">
              <button
                className="cache-btn cache-btn--secondary"
                onClick={() => setConfirm(null)}
                disabled={modalBusy}
              >
                Cancel
              </button>
              <button
                className="cache-btn cache-btn--danger"
                onClick={() =>
                  confirm.kind === "all"
                    ? handleClearAll()
                    : handleClearSection(confirm.section)
                }
                disabled={modalBusy}
              >
                {modalBusy
                  ? "Clearing…"
                  : confirm.kind === "all"
                    ? "Clear everything"
                    : "Clear cache"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`cache-toast cache-toast--${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span>
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default CacheControlScreen;
