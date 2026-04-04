import { useState, useEffect } from "react";
import pendingTransfersService from "../services/pending-transfers.service";
import type {
  PendingTransfersResponse,
  CateringTransfer,
  VenueHireTransfer,
} from "../services/pending-transfers.service";
import { ChevronDown, ChevronRight } from "lucide-react";

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatGBP(amount: number): string {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({
  data,
}: {
  data: PendingTransfersResponse;
}) {
  const { summary, cateringTransfers, venueHireTransfers } = data;
  const pastDueCount =
    cateringTransfers.filter((t) => t.isPastDue).length +
    venueHireTransfers.filter((t) => t.isPastDue).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          Total Pending
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {formatGBP(summary.totalPendingAmount)}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
        <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">
          Catering Pending
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {formatGBP(summary.totalPendingCateringAmount)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {summary.cateringOrderCount} order
          {summary.cateringOrderCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-purple-200 p-4 shadow-sm">
        <p className="text-xs text-purple-500 uppercase tracking-wide mb-1">
          Venue Hire Pending
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {formatGBP(summary.totalPendingVenueHireAmount)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {summary.coworkingOrderCount} order
          {summary.coworkingOrderCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className={`rounded-lg border p-4 shadow-sm ${
          pastDueCount > 0
            ? "bg-amber-50 border-amber-300"
            : "bg-white border-gray-200"
        }`}
      >
        <p
          className={`text-xs uppercase tracking-wide mb-1 ${
            pastDueCount > 0 ? "text-amber-600" : "text-gray-500"
          }`}
        >
          Past Due
        </p>
        <p
          className={`text-2xl font-bold ${
            pastDueCount > 0 ? "text-amber-700" : "text-gray-900"
          }`}
        >
          {pastDueCount}
        </p>
        <p className="text-xs text-gray-500 mt-1">transfers overdue</p>
      </div>
    </div>
  );
}

// ── Catering Table ────────────────────────────────────────────────────────────

function CateringTable({ transfers }: { transfers: CateringTransfer[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (orderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const rowClass = (t: CateringTransfer) => {
    if (t.transferFailureReason)
      return "border-l-4 border-red-400 bg-red-50";
    if (t.isPastDue) return "border-l-4 border-amber-400 bg-amber-50";
    return "";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Catering Payouts
        </h2>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
          {transfers.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Event Date
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Scheduled Date
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Restaurant Payouts
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Total Payout
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">Retries</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Failure Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No pending catering transfers
                </td>
              </tr>
            ) : (
              transfers.map((t) => {
                const isExpanded = expandedIds.has(t.orderId);
                return (
                  <tr key={t.orderId} className={rowClass(t)}>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {t.customerName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(t.eventDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(t.scheduledTransferDate)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(t.orderId)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        {t.restaurantPayouts.length} restaurant
                        {t.restaurantPayouts.length !== 1 ? "s" : ""}
                      </button>
                      {isExpanded && (
                        <ul className="mt-2 space-y-1">
                          {t.restaurantPayouts.map((rp) => (
                            <li
                              key={rp.restaurantId}
                              className="text-xs text-gray-700"
                            >
                              {rp.accountName}{" "}
                              <span className="font-medium text-gray-900">
                                → {formatGBP(rp.earningsAmount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatGBP(t.totalRestaurantPayout)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {t.transferRetryCount}
                    </td>
                    <td
                      className="px-4 py-3 text-gray-700 max-w-[200px] truncate"
                      title={t.transferFailureReason ?? undefined}
                    >
                      {t.transferFailureReason ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Venue Hire Table ──────────────────────────────────────────────────────────

function VenueHireTable({ transfers }: { transfers: VenueHireTransfer[] }) {
  const rowClass = (t: VenueHireTransfer) =>
    t.isPastDue ? "border-l-4 border-amber-400 bg-amber-50" : "";

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Venue Hire Payouts
        </h2>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
          {transfers.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">
                Coworking Order ID
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Catering Order ID
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Gross Fee
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Stripe Fee
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Net Payout
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Scheduled Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No pending venue hire transfers
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.coworkingOrderId} className={rowClass(t)}>
                  <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                    {t.coworkingOrderId}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {t.cateringOrderId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatGBP(t.venueHireFee)}
                  </td>
                  <td className="px-4 py-3 text-red-600">
                    -{formatGBP(t.stripeFee)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {formatGBP(t.netAmount)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(t.scheduledTransferDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PendingTransfersScreen() {
  const [data, setData] = useState<PendingTransfersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pendingTransfersService
      .getPendingTransfers()
      .then((res) => {
        setData(res);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load pending transfers"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f7fa]">
        <p className="text-gray-500">Loading pending transfers...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f7fa]">
        <p className="text-red-600">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f7fa] min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Pending Stripe Transfers
      </h1>
      <SummaryCards data={data} />
      <CateringTable transfers={data.cateringTransfers} />
      <VenueHireTable transfers={data.venueHireTransfers} />
    </div>
  );
}
