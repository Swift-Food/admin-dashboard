import { useCallback, useEffect, useMemo, useState } from "react";
import cateringService from "../../services/catering.service";
import cateringDeliveryService from "../../services/catering-delivery.service";
import { withdrawalService } from "../../services/withdrawal.service";
import type { AdminDeliverySession } from "../../types/catering-session.types";
import type { SidebarPage } from "../../components/Sidebar";
import {
  buildQueues,
  daysUntil,
  money,
  monthSummary,
  relativeDay,
  unbookedSessions,
  upcomingRunSheet,
  type ActionQueue,
  type OrderLike,
  type WithdrawalLike,
} from "./dashboard.data";

/**
 * What an admin sees first.
 *
 * It answers two questions and stops: what needs doing right now, and what is
 * going out over the next week. Aggregate figures sit at the bottom, small,
 * because nobody starts their day by reading a revenue total — they start it
 * by finding the order nobody has booked a courier for.
 */

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  pending: "Not ready",
  awaiting_booking: "Needs a courier",
  booked: "Courier booked",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  failed: "Failed",
  self_delivery: "Restaurant delivers",
};

const DELIVERY_STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  awaiting_booking: "bg-amber-100 text-amber-800",
  booked: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  self_delivery: "bg-emerald-100 text-emerald-800",
};

const restaurantsOn = (entry: AdminDeliverySession): string => {
  const names = new Set<string>();
  for (const item of entry.session.orderItems ?? []) {
    const name =
      item.restaurantName ||
      entry.session.restaurantPickupAddresses?.[item.restaurantId]?.name;
    if (name) names.add(name);
  }
  return [...names].join(", ") || "—";
};

const dropAddress = (entry: AdminDeliverySession): string => {
  const raw = entry.session.cateringOrder?.deliveryAddress;
  if (!raw) return "—";
  return typeof raw === "string" ? raw : "";
};

const DashboardScreen = ({ onNavigate }: { onNavigate?: (page: SidebarPage) => void }) => {
  const [orders, setOrders] = useState<OrderLike[]>([]);
  const [sessions, setSessions] = useState<AdminDeliverySession[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // One slow or failing source must not blank the whole page — each section
    // renders from whatever came back.
    const [o, s, w] = await Promise.allSettled([
      cateringService.getOrders(),
      cateringDeliveryService.getSessions(),
      withdrawalService.getAllWithdrawals(),
    ]);
    if (o.status === "fulfilled") setOrders(o.value as unknown as OrderLike[]);
    if (s.status === "fulfilled") setSessions(s.value);
    if (w.status === "fulfilled") setWithdrawals(w.value as unknown as WithdrawalLike[]);
    if (o.status === "rejected" && s.status === "rejected") {
      setError("Could not load the dashboard. Check the connection and try again.");
    }
    setNow(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 120_000);
    return () => clearInterval(timer);
  }, [load]);

  const queues = useMemo(
    () => buildQueues({ orders, sessions, withdrawals, now }),
    [orders, sessions, withdrawals, now],
  );
  const runSheet = useMemo(() => upcomingRunSheet(sessions, now), [sessions, now]);
  const unbooked = useMemo(() => new Set(unbookedSessions(sessions, now).map((e) => e.session.id)), [sessions, now]);
  const summary = useMemo(() => monthSummary(orders, sessions, now), [orders, sessions, now]);

  const go = (page: string) => onNavigate?.(page as SidebarPage);

  if (loading && sessions.length === 0 && orders.length === 0) {
    return (
      <div className="p-8 text-gray-600">Loading the dashboard…</div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f7f8fa] min-h-screen">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today at Swift</h1>
          <p className="text-sm text-gray-500">
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            {summary.delivering > 0
              ? ` · ${summary.delivering} ${summary.delivering === 1 ? "delivery" : "deliveries"} today`
              : " · nothing going out today"}
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">{error}</div>
      ) : null}

      {/* ── Needs attention ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
          Needs attention
        </h2>
        {queues.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-6 text-center">
            <p className="text-gray-800 font-semibold">Nothing needs chasing</p>
            <p className="text-sm text-gray-500 mt-1">
              Every order is accepted, paid and has a courier.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queues.map((q: ActionQueue) => (
              <button
                key={q.key}
                onClick={() => go(q.page)}
                className={`text-left bg-white border rounded-xl p-4 transition hover:shadow-md ${
                  q.severity === "urgent" ? "border-red-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl font-bold ${
                      q.severity === "urgent" ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {q.count}
                  </span>
                  <span className="font-semibold text-gray-900">{q.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{q.detail}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── The week's run sheet ────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Going out this week
          </h2>
          <button onClick={() => go("catering-sessions")} className="text-xs font-semibold text-blue-700 hover:underline">
            Open Deliveries
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {runSheet.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              Nothing scheduled in the next seven days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2">When</th>
                    <th className="text-left font-semibold px-4 py-2">From</th>
                    <th className="text-left font-semibold px-4 py-2">To</th>
                    <th className="text-left font-semibold px-4 py-2">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {runSheet.map((entry) => {
                    const days = daysUntil(entry.session.sessionDate, now);
                    const needsCourier = unbooked.has(entry.session.id);
                    return (
                      <tr
                        key={entry.session.id}
                        onClick={() => go("catering-sessions")}
                        className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          days === 0 ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">
                            {entry.session.collectionTime || entry.session.eventTime || "—"}
                          </span>
                          <span className="block text-xs text-gray-500">{relativeDay(days)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-800">{restaurantsOn(entry)}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[280px] truncate">
                          {dropAddress(entry)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                              DELIVERY_STATUS_STYLE[entry.session.deliveryStatus] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {DELIVERY_STATUS_LABEL[entry.session.deliveryStatus] ?? entry.session.deliveryStatus}
                          </span>
                          {entry.activeBooking?.quotedPrice ? (
                            <span className="ml-2 text-xs text-gray-500">
                              {entry.activeBooking.currency ?? "£"}
                              {entry.activeBooking.quotedPrice}
                            </span>
                          ) : null}
                          {needsCourier ? (
                            <span className="ml-2 text-xs font-semibold text-red-600">book it</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── This month, kept deliberately small ─────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">This month</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Orders", value: String(summary.orders) },
            { label: "Order value", value: money(summary.revenue) },
            { label: "Average order", value: money(summary.averageOrder) },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardScreen;
