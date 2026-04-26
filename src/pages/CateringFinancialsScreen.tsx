import { useState, useEffect } from "react";
import type { FinancialMetricsResponse } from "../types/catering-financials.types";
import cateringFinancialsService from "../services/catering-financials.service";

const LIMIT = 50;

function getDefaultDates() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function truncatePaymentId(id: string | null): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
    <div className="h-9 w-64 bg-gray-200 rounded mb-2" />
    <div className="h-5 w-48 bg-gray-200 rounded mb-8" />
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex gap-4">
      <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      <div className="h-10 w-24 bg-gray-200 rounded-lg" />
    </div>
    <div className="grid grid-cols-5 gap-4 mb-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-24 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="h-12 bg-gray-100 border-b border-gray-200" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-6 py-4 border-b border-gray-100">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

const CateringFinancialsScreen = () => {
  const defaults = getDefaultDates();
  const [fromDate, setFromDate] = useState<string | null>(defaults.from);
  const [toDate, setToDate] = useState<string | null>(defaults.to);
  const [pendingFrom, setPendingFrom] = useState(defaults.from);
  const [pendingTo, setPendingTo] = useState(defaults.to);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FinancialMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [pendingEdits, setPendingEdits] = useState<Record<string, number>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = (from: string | null, to: string | null, p: number) => {
    setLoading(true);
    setError(undefined);
    cateringFinancialsService
      .getFinancialMetrics({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        page: p,
        limit: LIMIT,
      })
      .then((res) => {
        setData(res);
        setLoading(false);
        setPendingEdits({});
        setEditingCell(null);
        setEditingValue("");
      })
      .catch((e: any) => {
        setError(e?.message || "Failed to load financial metrics");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(fromDate, toDate, page);
  }, [fromDate, toDate, page]);

  const handleApply = () => {
    setFromDate(pendingFrom || null);
    setToDate(pendingTo || null);
    setPage(1);
  };

  const handleClear = () => {
    setPendingFrom("");
    setPendingTo("");
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const handleSaveMscFees = async () => {
    if (Object.keys(pendingEdits).length === 0) return;
    setSaving(true);
    try {
      const result = await cateringFinancialsService.updateMscFees(pendingEdits);
      if (result.notFound.length > 0) {
        showToast(
          `${result.updated} order${result.updated !== 1 ? "s" : ""} updated. Not found: ${result.notFound.join(", ")}`,
          "warning"
        );
      } else {
        showToast(
          `MSC fees updated for ${result.updated} order${result.updated !== 1 ? "s" : ""}`,
          "success"
        );
      }
      fetchData(fromDate, toDate, page);
    } catch (e: any) {
      showToast(e?.message || "Failed to save MSC fees", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 text-lg font-semibold">{error}</p>
        <button
          onClick={() => fetchData(fromDate, toDate, page)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { orders, totals, pagination } = data;
  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Catering Financials</h1>
        <p className="text-gray-600">
          {fromDate || toDate ? (
            <>
              {fromDate
                ? new Date(fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "All time"}
              {" — "}
              {toDate
                ? new Date(toDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "today"}
            </>
          ) : (
            "All time"
          )}
        </p>
      </div>

      {/* Date filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            From
          </label>
          <input
            type="date"
            value={pendingFrom}
            max={pendingTo}
            onChange={(e) => setPendingFrom(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            To
          </label>
          <input
            type="date"
            value={pendingTo}
            min={pendingFrom}
            onChange={(e) => setPendingTo(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleApply}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
        >
          Apply
        </button>
        <button
          onClick={handleClear}
          className="px-6 py-2 border-2 border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold rounded-lg transition-colors"
        >
          All time
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-2">
            Total Gross Revenue
          </p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(totals.grossOrderValue)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-2">
            Total Commission
          </p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(totals.commission)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 shadow-sm">
          <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-2">
            Platform Revenue
          </p>
          <p className="text-2xl font-bold text-purple-900">
            {formatCurrency(totals.totalPlatformRevenue)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200 shadow-sm">
          <p className="text-xs text-orange-700 font-semibold uppercase tracking-wide mb-2">
            Total Profit
          </p>
          <p className="text-2xl font-bold text-orange-900">
            {formatCurrency(totals.profit)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">
            Orders
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {totals.orderCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Save MSC Fees button */}
      {Object.keys(pendingEdits).length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleSaveMscFees}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            {saving && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            Save MSC Fees ({Object.keys(pendingEdits).length})
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <tr>
                {[
                  { label: "Order Date", align: "left" },
                  { label: "Customer Email", align: "left" },
                  { label: "Payment ID", align: "left" },
                  { label: "Promo Code", align: "left" },
                  { label: "Promo Discount", align: "right" },
                  { label: "Gross Value", align: "right" },
                  { label: "Gross excl. Delivery", align: "right" },
                  { label: "Commission", align: "right" },
                  { label: "Delivery Fee", align: "right" },
                  { label: "Service Charge", align: "right" },
                  { label: "Processing Fee", align: "right" },
                  { label: "Invoicing Fee (0.4%)", align: "right" },
                  { label: "MSC Fee", align: "right" },
                  { label: "Owed to Restaurant", align: "right" },
                  { label: "Platform Revenue", align: "right" },
                  { label: "Profit", align: "right" },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap text-${align}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr
                  key={order.orderId}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                    {new Date(order.orderDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                    {order.customerEmail}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs"
                    title={order.paymentId ?? undefined}
                  >
                    {truncatePaymentId(order.paymentId)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {order.promoCode ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {order.promoDiscount === 0 ? "—" : formatCurrency(order.promoDiscount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-gray-900">
                    {formatCurrency(order.grossOrderValue)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {formatCurrency(order.grossExclDelivery)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {formatCurrency(order.commission)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {formatCurrency(order.deliveryFee)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {formatCurrency(order.serviceCharge)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {order.paymentProcessingFee === 0
                      ? "—"
                      : formatCurrency(order.paymentProcessingFee)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {formatCurrency(order.invoicingFee)}
                  </td>
                  <td
                    className={`px-4 py-3 whitespace-nowrap text-right text-gray-700 cursor-pointer select-none ${
                      pendingEdits[order.orderId] !== undefined ? "bg-amber-50" : ""
                    }`}
                    onClick={() => {
                      if (editingCell === order.orderId) return;
                      setEditingCell(order.orderId);
                      setEditingValue(
                        String(
                          pendingEdits[order.orderId] !== undefined
                            ? pendingEdits[order.orderId]
                            : order.mscFee
                        )
                      );
                    }}
                  >
                    {editingCell === order.orderId ? (
                      <span className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingValue}
                          autoFocus
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseFloat(editingValue);
                              if (isNaN(val) || val < 0) return;
                              if (val === order.mscFee) {
                                const next = { ...pendingEdits };
                                delete next[order.orderId];
                                setPendingEdits(next);
                              } else {
                                setPendingEdits((prev) => ({
                                  ...prev,
                                  [order.orderId]: val,
                                }));
                              }
                              setEditingCell(null);
                            } else if (e.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                          onBlur={(e) => {
                            if (
                              (e.relatedTarget as HTMLElement)?.dataset?.confirm ===
                              order.orderId
                            )
                              return;
                            setEditingCell(null);
                          }}
                          className={`w-24 px-2 py-0.5 border rounded text-right text-sm ${
                            editingValue !== "" &&
                            (isNaN(parseFloat(editingValue)) ||
                              parseFloat(editingValue) < 0)
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          } focus:outline-none focus:ring-2`}
                        />
                        <button
                          data-confirm={order.orderId}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            const val = parseFloat(editingValue);
                            if (isNaN(val) || val < 0) return;
                            if (val === order.mscFee) {
                              const next = { ...pendingEdits };
                              delete next[order.orderId];
                              setPendingEdits(next);
                            } else {
                              setPendingEdits((prev) => ({
                                ...prev,
                                [order.orderId]: val,
                              }));
                            }
                            setEditingCell(null);
                          }}
                          className="text-green-600 hover:text-green-700 font-bold text-base leading-none"
                        >
                          ✓
                        </button>
                      </span>
                    ) : (
                      formatCurrency(
                        pendingEdits[order.orderId] !== undefined
                          ? pendingEdits[order.orderId]
                          : order.mscFee
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {formatCurrency(order.amountOwedToRestaurant)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                    {formatCurrency(order.totalPlatformRevenue)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900">
                    {formatCurrency(order.profit)}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td colSpan={4} className="px-4 py-3 text-gray-900 font-bold">
                  Total ({pagination.total} orders)
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.promoDiscount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.grossOrderValue)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.grossExclDelivery)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.commission)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.deliveryFee)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.serviceCharge)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.paymentProcessingFee)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.invoicingFee)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.mscFee)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.amountOwedToRestaurant)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.totalPlatformRevenue)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-white font-semibold text-sm transition-all ${
            toast.type === "success"
              ? "bg-green-600"
              : toast.type === "warning"
              ? "bg-amber-500"
              : "bg-red-600"
          }`}
        >
          <span>
            {toast.type === "success" ? "✓" : toast.type === "warning" ? "⚠" : "✗"}
          </span>
          {toast.message}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing{" "}
          <span className="font-semibold text-gray-900">{start}</span>–
          <span className="font-semibold text-gray-900">{end}</span> of{" "}
          <span className="font-semibold text-gray-900">{pagination.total}</span>{" "}
          orders
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-700 font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CateringFinancialsScreen;
