import { useEffect, useState } from "react";
import type {
  OrderFinancialsCell,
  OrderFinancialsOverviewResponse,
} from "../types/order-financials.types";
import orderFinancialsService from "../services/order-financials.service";

function formatCurrency(amount: number): string {
  return `£${(amount || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusPill(status: string | null | undefined) {
  if (!status) return null;
  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-800 border-green-200",
    inactive: "bg-gray-200 text-gray-700 border-gray-300",
    coming_soon: "bg-amber-100 text-amber-800 border-amber-200",
  };
  const cls = colorMap[status] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${cls}`}
    >
      {status.replace("_", " ")}
    </span>
  );
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
    <div className="grid grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
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

const OrderFinancialsScreen = () => {
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState<string>("");
  const [data, setData] = useState<OrderFinancialsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [downloading, setDownloading] = useState<"summary" | "detail" | null>(null);

  const fetchData = (from: string | null, to: string | null) => {
    setLoading(true);
    setError(undefined);
    orderFinancialsService
      .getOverview({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Failed to load order financials");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(fromDate, toDate);
  }, [fromDate, toDate]);

  const handleApply = () => {
    setFromDate(pendingFrom || null);
    setToDate(pendingTo || null);
  };

  const handleClear = () => {
    setPendingFrom("");
    setPendingTo("");
    setFromDate(null);
    setToDate(null);
  };

  const handleDownload = async (kind: "summary" | "detail") => {
    setDownloading(kind);
    try {
      await orderFinancialsService.downloadCSV(kind, {
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate ? { to: toDate } : {}),
      });
    } catch (e) {
      // Surface failure inline (toast pattern not required for an export)
      window.alert(`CSV download failed: ${String(e)}`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 text-lg font-semibold">{error}</p>
        <button
          onClick={() => fetchData(fromDate, toDate)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { cells, restaurants, grandTotals } = data;
  const filteredCells: OrderFinancialsCell[] = restaurantFilter
    ? cells.filter((c) => c.restaurantId === restaurantFilter)
    : cells;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Financials</h1>
        <p className="text-gray-600">
          Commission invoices for the regular delivery <code>orders</code> table
          (pre-catering era). One invoice per restaurant per month.
          {fromDate || toDate ? (
            <>
              {" "}
              {fromDate
                ? new Date(fromDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "All time"}{" "}
              —{" "}
              {toDate
                ? new Date(toDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "today"}
            </>
          ) : (
            " · All time"
          )}
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            From
          </label>
          <input
            type="date"
            value={pendingFrom}
            max={pendingTo || undefined}
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
            min={pendingFrom || undefined}
            onChange={(e) => setPendingTo(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Restaurant
          </label>
          <select
            value={restaurantFilter}
            onChange={(e) => setRestaurantFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[220px]"
          >
            <option value="">All restaurants ({restaurants.length})</option>
            {restaurants.map((r) => (
              <option key={r.restaurantId} value={r.restaurantId}>
                {r.restaurantName}
                {r.status && r.status !== "active" ? ` · ${r.status}` : ""}
              </option>
            ))}
          </select>
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

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => handleDownload("summary")}
            disabled={downloading !== null}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            {downloading === "summary" ? "Downloading…" : "Summary CSV"}
          </button>
          <button
            onClick={() => handleDownload("detail")}
            disabled={downloading !== null}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            {downloading === "detail" ? "Downloading…" : "Detail CSV"}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">
            Delivered Orders
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {grandTotals.orderCount.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-2">
            Gross Sales
          </p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(grandTotals.grossSales)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 shadow-sm">
          <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-2">
            Restaurant Net
          </p>
          <p className="text-2xl font-bold text-purple-900">
            {formatCurrency(grandTotals.restaurantNet)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-2">
            Total Commission
          </p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(grandTotals.commission)}
          </p>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <tr>
                {[
                  { label: "Period", align: "left" },
                  { label: "Restaurant", align: "left" },
                  { label: "Status", align: "left" },
                  { label: "Orders", align: "right" },
                  { label: "Gross", align: "right" },
                  { label: "Restaurant Net", align: "right" },
                  { label: "Commission", align: "right" },
                  { label: "Eff. %", align: "right" },
                  { label: "Invoice", align: "right" },
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
              {filteredCells.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No delivered regular orders in this date range.
                  </td>
                </tr>
              ) : (
                filteredCells.map((c) => (
                  <tr
                    key={`${c.restaurantId}-${c.year}-${c.month}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">
                      {c.monthName} {c.year}
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-[260px] truncate">
                      {c.restaurantName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusPill(c.restaurantStatus)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                      {c.orderCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                      {formatCurrency(c.grossSales)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                      {formatCurrency(c.restaurantNet)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900">
                      {formatCurrency(c.commission)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                      {c.effectiveRatePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() =>
                          orderFinancialsService.openInvoiceHTML(
                            c.restaurantId,
                            c.year,
                            c.month
                          )
                        }
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Data source: <code>orders</code> table, <code>status='delivered'</code>.
        Commission = <code>orderItem.totalPrice − orderItem.restaurantCost</code>{" "}
        (as stored at order time). Click <strong>View</strong> to open the
        printable invoice in a new tab.
      </p>
    </div>
  );
};

export default OrderFinancialsScreen;
