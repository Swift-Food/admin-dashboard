import type { RefundRecord } from "../../services/refund.service";

// Small pill matching Swift's colour language: green for processed money
// movement, red for outright failure, amber when we couldn't touch Stripe
// (admin needs to reconcile manually), grey for anything else.
interface Props {
  status: RefundRecord["status"];
  stripeRefundId: string | null;
  processingNotes: string | null;
  className?: string;
}

export function RefundStatusBadge({
  status,
  stripeRefundId,
  processingNotes,
  className = "",
}: Props) {
  const manualNote = processingNotes?.toLowerCase().includes("manual");

  let label = status.charAt(0).toUpperCase() + status.slice(1);
  let tone = "bg-gray-100 text-gray-700 border-gray-200";

  if (status === "processed" && stripeRefundId) {
    label = "Refunded via Stripe";
    tone = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (status === "processed" && manualNote) {
    label = "Manual refund needed";
    tone = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (status === "processed") {
    label = "Processed";
    tone = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (status === "rejected") {
    label = "Rejected";
    tone = "bg-red-50 text-red-700 border-red-200";
  } else if (status === "cancelled") {
    label = "Cancelled";
    tone = "bg-gray-100 text-gray-600 border-gray-200";
  } else if (status === "pending") {
    label = "Pending";
    tone = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (status === "approved") {
    label = "Approved";
    tone = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
