import type { AdminDeliverySession } from "../../types/catering-session.types";

/**
 * Turning the day's data into the few things an admin has to act on.
 *
 * The guiding rule here is that a dashboard earns its place by surfacing
 * exceptions, not totals. A number nobody can act on is noise, so every queue
 * below is something that is wrong now and can be fixed from a screen we
 * already have.
 */

export interface OrderLike {
  id: string;
  status: string;
  eventDate: string | Date;
  customerName?: string;
  finalTotal?: number;
  estimatedTotal?: number;
  createdAt?: string | Date;
}

export interface WithdrawalLike {
  id: string;
  status: string;
  amount: string | number;
  stripePayoutId?: string;
}

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const startOfToday = (now: Date): Date =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate());

const asDate = (v: string | Date | undefined | null): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Days from today until the event; negative once it is in the past. */
export const daysUntil = (value: string | Date, now: Date): number => {
  const d = asDate(value);
  if (!d) return Number.POSITIVE_INFINITY;
  const event = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((event.getTime() - startOfToday(now).getTime()) / MS_PER_DAY);
};

export const money = (n: number): string =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "in 3 days" / "today" / "tomorrow" / "2 days ago" — how ops speaks. */
export const relativeDay = (days: number): string => {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
};

export interface ActionQueue {
  key: string;
  label: string;
  /** Why it matters, in one line. */
  detail: string;
  count: number;
  /** Where it gets fixed. */
  page: string;
  severity: "urgent" | "warn";
}

/**
 * A session that is paid for but has nobody assigned to deliver it. This is
 * the queue that matters most: it is silent — nothing errors, the order simply
 * sits there — and it is only noticed when someone opens the right screen on
 * the right day.
 */
export function unbookedSessions(
  sessions: AdminDeliverySession[],
  now: Date,
  withinDays = 7,
): AdminDeliverySession[] {
  return sessions
    .filter((entry) => {
      if (entry.activeBooking) return false;
      if (entry.session.deliveryStatus !== "awaiting_booking") return false;
      const days = daysUntil(entry.session.sessionDate, now);
      return days >= 0 && days <= withinDays;
    })
    .sort(
      (a, b) =>
        daysUntil(a.session.sessionDate, now) - daysUntil(b.session.sessionDate, now),
    );
}

/** Everything happening between today and `withinDays`, in the order it happens. */
export function upcomingRunSheet(
  sessions: AdminDeliverySession[],
  now: Date,
  withinDays = 7,
): AdminDeliverySession[] {
  return sessions
    .filter((entry) => {
      const days = daysUntil(entry.session.sessionDate, now);
      if (days < 0 || days > withinDays) return false;
      return entry.session.deliveryStatus !== "delivered";
    })
    .sort((a, b) => {
      const dayDiff =
        daysUntil(a.session.sessionDate, now) - daysUntil(b.session.sessionDate, now);
      if (dayDiff !== 0) return dayDiff;
      const at = a.session.collectionTime || a.session.eventTime || "";
      const bt = b.session.collectionTime || b.session.eventTime || "";
      return at.localeCompare(bt);
    });
}

export function buildQueues(params: {
  orders: OrderLike[];
  sessions: AdminDeliverySession[];
  withdrawals: WithdrawalLike[];
  now: Date;
}): ActionQueue[] {
  const { orders, sessions, withdrawals, now } = params;

  const awaitingRestaurant = orders.filter((o) => o.status === "pending_review");
  const awaitingPayment = orders.filter(
    (o) =>
      (o.status === "restaurant_reviewed" || o.status === "payment_link_sent") &&
      daysUntil(o.eventDate, now) >= 0,
  );
  const unbooked = unbookedSessions(sessions, now);
  const rebook = sessions.filter((s) => s.needsRebooking);
  const failed = sessions.filter((s) => s.session.deliveryStatus === "failed");
  const pendingWithdrawals = withdrawals.filter(
    (w) => w.status === "pending" && !w.stripePayoutId,
  );

  const queues: ActionQueue[] = [
    {
      key: "unbooked",
      label: "No courier booked",
      detail: "Paid, happening within a week, and nobody assigned to deliver it",
      count: unbooked.length,
      page: "catering-sessions",
      severity: "urgent",
    },
    {
      key: "failed",
      label: "Delivery failed",
      detail: "The courier could not complete it",
      count: failed.length,
      page: "catering-sessions",
      severity: "urgent",
    },
    {
      key: "rebook",
      label: "Rebook needed",
      detail: "The time or address changed after the courier was booked",
      count: rebook.length,
      page: "catering-sessions",
      severity: "urgent",
    },
    {
      key: "awaiting-restaurant",
      label: "Waiting on a restaurant",
      detail: "Sent to the restaurant, not yet accepted",
      count: awaitingRestaurant.length,
      page: "catering",
      severity: "warn",
    },
    {
      key: "awaiting-payment",
      label: "Awaiting payment",
      detail: "Quoted or invoiced, still unpaid, event ahead",
      count: awaitingPayment.length,
      page: "catering",
      severity: "warn",
    },
    {
      key: "withdrawals",
      label: "Withdrawals to review",
      detail: "Requested by a restaurant, no payout made yet",
      count: pendingWithdrawals.length,
      page: "payout",
      severity: "warn",
    },
  ];

  // A quiet day should look quiet.
  return queues.filter((q) => q.count > 0);
}

export interface MonthSummary {
  orders: number;
  revenue: number;
  averageOrder: number;
  delivering: number;
}

/** Deliberately few numbers, and only ones that answer a real question. */
export function monthSummary(
  orders: OrderLike[],
  sessions: AdminDeliverySession[],
  now: Date,
): MonthSummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const counted = orders.filter((o) => {
    const d = asDate(o.eventDate);
    if (!d) return false;
    if (d < monthStart) return false;
    return o.status !== "cancelled" && o.status !== "pending_review";
  });
  const revenue = counted.reduce(
    (sum, o) => sum + Number(o.finalTotal ?? o.estimatedTotal ?? 0),
    0,
  );
  return {
    orders: counted.length,
    revenue,
    averageOrder: counted.length ? revenue / counted.length : 0,
    delivering: sessions.filter((s) => daysUntil(s.session.sessionDate, now) === 0).length,
  };
}
