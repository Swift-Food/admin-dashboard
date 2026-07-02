import type { RefundRecord } from "../../services/refund.service";
import { RefundStatusBadge } from "./RefundStatusBadge";

interface Props {
  refund: RefundRecord;
  currency?: string;
  /**
   * When true, hide Swift-internal detail (Stripe id, admin reviewer id) —
   * used when a restaurant partner is viewing the refund on their own
   * dashboard.
   */
  restaurantView?: boolean;
}

function formatCurrency(n: number | null | undefined, symbol = "£") {
  return `${symbol}${Number(n ?? 0).toFixed(2)}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RefundLineItem({
  refund,
  currency = "£",
  restaurantView = false,
}: Props) {
  const amount = refund.approvedAmount ?? refund.requestedAmount;
  const restaurant =
    refund.restaurant?.restaurant_name ??
    (refund.restaurantId ? "Restaurant" : "Order-level");

  const note = refund.reason || refund.adminNotes || null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(amount, currency)}
          </div>
          <div className="text-sm text-gray-600">{restaurant}</div>
        </div>
        <RefundStatusBadge
          status={refund.status}
          stripeRefundId={refund.stripeRefundId}
          processingNotes={refund.processingNotes}
        />
      </div>

      {note && (
        <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Reason
          </span>
          {note}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <div>
          <span className="font-medium">Issued:</span>{" "}
          {formatDateTime(refund.processedAt || refund.createdAt)}
        </div>
        {refund.stripeRefundId && !restaurantView && (
          <div className="font-mono">
            <span className="font-medium">Stripe:</span> {refund.stripeRefundId}
          </div>
        )}
        {refund.processingNotes && (
          <div className="text-amber-700 basis-full">
            {refund.processingNotes}
          </div>
        )}
      </div>
    </div>
  );
}
