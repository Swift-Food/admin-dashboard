import { useEffect, useMemo, useState } from "react";
import { Modal } from "../Modal";
import refundService from "../../services/refund.service";
import { RefundHistoryList } from "./RefundHistoryList";

// Just the shape we need out of a CateringOrder — kept loose so we can
// consume from admin or restaurant flows without an entity dependency.
export interface RefundModalOrder {
  id: string;
  customerName?: string;
  finalTotal?: number | string;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  restaurants?: Array<{
    restaurantId: string;
    restaurantName: string;
    customerTotal: number | string;
    hasRefund?: boolean;
  }>;
}

interface Props {
  order: RefundModalOrder;
  open: boolean;
  onClose: () => void;
  onIssued?: () => void;
}

function toCurrency(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `£${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
}

export function RefundModal({ order, open, onClose, onIssued }: Props) {
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyToken, setHistoryToken] = useState(0);

  const restaurants = order.restaurants || [];
  const selected = restaurants.find((r) => r.restaurantId === restaurantId);

  // When the modal opens, if there's exactly one refundable restaurant on
  // the order, pre-select it + prefill amount to their subtotal. Saves the
  // admin a click on the common case.
  useEffect(() => {
    if (!open) return;
    if (restaurantId) return;
    const refundable = restaurants.filter((r) => !r.hasRefund);
    if (refundable.length === 1) {
      const only = refundable[0];
      setRestaurantId(only.restaurantId);
      setAmount(String(only.customerTotal));
    }
  }, [open, restaurantId, restaurants]);
  const stripeAttached = Boolean(
    order.stripePaymentIntentId || order.stripeInvoiceId,
  );
  const parsedAmount = Number(amount);
  const amountValid =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    (!selected || parsedAmount <= Number(selected.customerTotal));

  const canSubmit = restaurantId && amountValid && !submitting;

  const quickFills = useMemo(() => {
    if (!selected) return [] as { label: string; value: number }[];
    const total = Number(selected.customerTotal);
    if (!Number.isFinite(total) || total <= 0) return [];
    return [
      { label: "25%", value: Math.round(total * 0.25 * 100) / 100 },
      { label: "50%", value: Math.round(total * 0.5 * 100) / 100 },
      { label: "100%", value: total },
    ];
  }, [selected]);

  const resetAndClose = () => {
    setRestaurantId("");
    setAmount("");
    setReason("");
    setError(null);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await refundService.issueAdminRefund({
        cateringOrderId: order.id,
        restaurantId: selected.restaurantId,
        amount: Number(amount),
        reason: reason.trim() || undefined,
      });
      setHistoryToken((n) => n + 1);
      onIssued?.();
      resetAndClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to issue refund",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={resetAndClose} overlayOpacity={60} closeOnOverlayClick={false}>
      <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 my-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Issue Refund</h3>
              <p className="text-sm text-purple-100 mt-1">
                Refund the customer via Stripe and deduct the amount from the
                restaurant&rsquo;s next payout. Restaurant partner will see
                this on their dashboard.
              </p>
            </div>
            <button
              onClick={resetAndClose}
              className="text-white/80 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Order context */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">
                Order
              </div>
              <div className="font-mono text-gray-900">
                #{order.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">
                Customer
              </div>
              <div className="text-gray-900">
                {order.customerName || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">
                Order total
              </div>
              <div className="text-gray-900 font-semibold">
                {toCurrency(order.finalTotal)}
              </div>
            </div>
          </div>

          {/* Stripe state banner */}
          {stripeAttached ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="font-semibold mb-1">
                Refund will process automatically via Stripe
              </div>
              <div className="text-emerald-900/90">
                Money is refunded to {order.customerName || "the customer"}
                &rsquo;s card. The selected restaurant&rsquo;s next payout will
                be reduced by the same amount.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold mb-1">
                No Stripe charge attached to this order
              </div>
              <div>
                The refund will be recorded in the restaurant&rsquo;s balance,
                but you&rsquo;ll need to refund the customer manually on
                Stripe or via bank transfer.
              </div>
            </div>
          )}

          {/* Restaurant picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Restaurant to charge back
            </label>
            <p className="text-xs text-gray-500 mb-2">
              The chosen restaurant&rsquo;s next payout is reduced by the
              refund amount.
            </p>
            <select
              value={restaurantId}
              onChange={(e) => {
                const id = e.target.value;
                setRestaurantId(id);
                const r = restaurants.find((x) => x.restaurantId === id);
                setAmount(r ? String(r.customerTotal) : "");
                setError(null);
              }}
              className="w-full px-3 py-2.5 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a restaurant</option>
              {restaurants.map((r) => (
                <option
                  key={r.restaurantId}
                  value={r.restaurantId}
                  disabled={r.hasRefund}
                >
                  {r.restaurantName} — {toCurrency(r.customerTotal)}
                  {r.hasRefund ? " (already refunded)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Amount to refund
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={selected ? Number(selected.customerTotal) : undefined}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                disabled={!selected}
                className="w-full pl-8 pr-3 py-2.5 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="0.00"
              />
            </div>
            {selected && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">
                  Up to {toCurrency(selected.customerTotal)}
                </span>
                <div className="flex gap-1.5 ml-auto">
                  {quickFills.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => setAmount(String(q.value))}
                      className="text-xs px-2 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      {q.label} · {toCurrency(q.value)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Reason
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Shown on the restaurant partner&rsquo;s dashboard next to this
              refund. Be specific — a good reason avoids disputes.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g. 1h25m late delivery — 50% delay fee per §3 of Partner T&Cs"
            />
          </div>

          {/* Live preview */}
          {selected && amountValid && (
            <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm">
              <div className="font-semibold text-purple-900 mb-1">
                What will happen
              </div>
              <ul className="text-purple-900/90 space-y-1 list-disc pl-5">
                <li>
                  {toCurrency(parsedAmount)} refunded to{" "}
                  {order.customerName || "the customer"}
                  {stripeAttached ? " via Stripe" : " (manual)"}.
                </li>
                <li>
                  {selected.restaurantName}&rsquo;s next payout reduced by{" "}
                  {toCurrency(parsedAmount)}.
                </li>
                <li>
                  Refund logged and visible on both admin and restaurant
                  dashboards.
                </li>
              </ul>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Refund history */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">
              Previous refunds on this order
            </div>
            <RefundHistoryList
              orderId={order.id}
              reloadToken={historyToken}
              emptyMessage="No refunds issued on this order yet."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={resetAndClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Processing…"
              : `Issue refund${
                  parsedAmount > 0 ? ` · ${toCurrency(parsedAmount)}` : ""
                }`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
