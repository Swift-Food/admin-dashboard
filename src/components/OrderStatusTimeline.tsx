import { useEffect, useState } from "react";
import cateringService, { type OrderTimeline, type TimelineStep } from "../services/catering.service";

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

const DOT: Record<TimelineStep["state"], string> = {
  done: "bg-green-500 border-green-500 text-white",
  current: "bg-blue-600 border-blue-600 text-white animate-pulse",
  pending: "bg-white border-gray-300 text-gray-300",
  skipped: "bg-gray-100 border-gray-300 text-gray-400 border-dashed",
  failed: "bg-red-500 border-red-500 text-white",
};

const LINE: Record<TimelineStep["state"], string> = {
  done: "bg-green-500",
  current: "bg-gray-200",
  pending: "bg-gray-200",
  skipped: "bg-gray-200",
  failed: "bg-red-300",
};

const glyph = (state: TimelineStep["state"]) =>
  state === "done" ? "✓" : state === "failed" ? "✕" : state === "skipped" ? "–" : "";

/**
 * The order's life at a glance: placed → reviewed → restaurants confirmed →
 * payment link → paid → delivery arranged → picked up → delivered → completed
 * (or cancelled), with when each happened and what we know about it.
 */
const OrderStatusTimeline = ({ orderId, refreshKey }: { orderId: string; refreshKey?: string | number }) => {
  const [timeline, setTimeline] = useState<OrderTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    cateringService
      .getOrderTimeline(orderId)
      .then((t) => {
        if (!cancelled) setTimeline(t);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message || "Could not load the timeline");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, refreshKey]);

  if (error) {
    return <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</div>;
  }
  if (!timeline) {
    return <div className="mb-3 h-16 rounded-xl bg-gray-50 border border-gray-200/80 animate-pulse" />;
  }

  const { steps, sessions } = timeline;
  const details = steps.filter((s) => s.detail && s.state !== "pending");

  return (
    <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 mb-3">
      <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Order progress</h3>

      {/* Stepper */}
      <ol className="flex items-start overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <li key={step.key} className="flex-1 min-w-[92px] flex flex-col items-center text-center relative">
            {i > 0 ? (
              <span className={`absolute top-3 right-1/2 w-full h-0.5 ${LINE[steps[i - 1].state === "done" ? "done" : step.state === "failed" ? "failed" : "pending"]}`} />
            ) : null}
            <span
              title={step.detail ?? undefined}
              className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold ${DOT[step.state]}`}
            >
              {glyph(step.state)}
            </span>
            <span
              className={`mt-1.5 text-[11px] font-semibold leading-tight ${
                step.state === "pending" || step.state === "skipped" ? "text-gray-400" : step.state === "failed" ? "text-red-700" : "text-gray-800"
              }`}
            >
              {step.label}
            </span>
            <span className="text-[10px] text-gray-500 leading-tight">
              {fmt(step.at) ?? (step.state === "current" ? "in progress" : step.state === "done" ? "time not recorded" : "")}
            </span>
          </li>
        ))}
      </ol>

      {/* Details */}
      {details.length ? (
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {details.map((s) => (
            <div key={s.key} className="flex gap-2">
              <dt className="text-gray-500 whitespace-nowrap">{s.label}:</dt>
              <dd className={s.state === "failed" ? "text-red-700" : "text-gray-800"}>{s.detail}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* Per-session delivery */}
      {sessions.length > 1 ? (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-2 font-medium">Session</th>
              <th className="py-1 pr-2 font-medium">Restaurants</th>
              <th className="py-1 pr-2 font-medium">Delivery</th>
              <th className="py-1 pr-2 font-medium">Booked</th>
              <th className="py-1 pr-2 font-medium">Picked up</th>
              <th className="py-1 font-medium">Delivered</th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            {sessions.map((s) => (
              <tr key={s.sessionId} className="border-t border-gray-200/80">
                <td className="py-1 pr-2 font-medium">
                  {s.name} · {new Date(s.date).toLocaleDateString("en-GB")} {s.eventTime ?? ""}
                </td>
                <td className="py-1 pr-2">{s.restaurants.join(", ")}</td>
                <td className="py-1 pr-2">{s.selfDelivery ? "Restaurant delivers" : `${s.provider ?? "Courier"} · ${s.deliveryStatus.replace(/_/g, " ")}`}</td>
                <td className="py-1 pr-2">{s.selfDelivery ? "—" : (fmt(s.bookedAt) ?? "not yet")}</td>
                <td className="py-1 pr-2">{s.selfDelivery ? "—" : (fmt(s.outForDeliveryAt) ?? "not yet")}</td>
                <td className="py-1">{fmt(s.deliveredAt) ?? "not yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
};

export default OrderStatusTimeline;
