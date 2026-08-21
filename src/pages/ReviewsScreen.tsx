import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import reviewsService from "../services/reviews.service";
import type { ReviewListResponse, ReviewRow } from "../types/reviews.types";
import ReviewDetailModal from "../components/ReviewDetailModal";
import { Stars } from "../components/Stars";

const LIMIT = 50;

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
    <div className="h-9 w-64 bg-gray-200 rounded mb-2" />
    <div className="h-5 w-48 bg-gray-200 rounded mb-8" />
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

const ReviewsScreen = () => {
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [pendingMinScore, setPendingMinScore] = useState("");
  const [pendingHasComment, setPendingHasComment] = useState(false);
  const [pendingRestaurantId, setPendingRestaurantId] = useState("");

  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [hasComment, setHasComment] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [selected, setSelected] = useState<ReviewRow | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(undefined);
    reviewsService
      .getReviews({
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate ? { to: toDate } : {}),
        ...(minScore ? { minScore } : {}),
        ...(hasComment ? { hasComment: true } : {}),
        ...(restaurantId ? { restaurantId } : {}),
        page,
        limit: LIMIT,
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Failed to load reviews");
        setLoading(false);
      });
  };

  useEffect(fetchData, [fromDate, toDate, minScore, hasComment, restaurantId, page]);

  const handleApply = () => {
    setFromDate(pendingFrom || null);
    setToDate(pendingTo || null);
    setMinScore(pendingMinScore ? Number(pendingMinScore) : null);
    setHasComment(pendingHasComment);
    setRestaurantId(pendingRestaurantId.trim() || null);
    setPage(1);
  };

  if (loading && !data) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const rows: ReviewRow[] = data?.data ?? [];
  const totals = data?.totals;
  const pagination = data?.pagination;
  const start = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviews</h1>
      <p className="text-gray-500 mb-8">
        Customer feedback on completed catering orders.
      </p>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-xs font-semibold text-gray-600">
          From
          <input
            type="date"
            value={pendingFrom}
            onChange={(e) => setPendingFrom(e.target.value)}
            className="mt-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-gray-600">
          To
          <input
            type="date"
            value={pendingTo}
            onChange={(e) => setPendingTo(e.target.value)}
            className="mt-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-gray-600">
          Min overall score
          <select
            value={pendingMinScore}
            onChange={(e) => setPendingMinScore(e.target.value)}
            className="mt-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
          <input
            type="checkbox"
            checked={pendingHasComment}
            onChange={(e) => setPendingHasComment(e.target.checked)}
          />
          With comments only
        </label>
        <label className="flex flex-col text-xs font-semibold text-gray-600">
          Restaurant ID
          <input
            type="text"
            value={pendingRestaurantId}
            onChange={(e) => setPendingRestaurantId(e.target.value)}
            placeholder="Restaurant UUID"
            className="mt-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-mono w-64"
          />
        </label>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          Apply
        </button>
      </div>

      {/* Stat tiles */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total reviews", value: totals.totalReviews },
            {
              label: "Avg overall",
              value:
                totals.averageOrderScore === null ||
                totals.averageOrderScore === undefined
                  ? "-"
                  : totals.averageOrderScore,
            },
            {
              label: "Avg restaurant",
              value:
                totals.averageRestaurantScore === null ||
                totals.averageRestaurantScore === undefined
                  ? "-"
                  : totals.averageRestaurantScore,
            },
            { label: "With comments", value: `${totals.percentWithComment}%` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <tr>
                {["", "Submitted", "Order", "Reviewer", "Overall", "Restaurants", "Comment"].map(
                  (label, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                    >
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No reviews match these filters.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.submissionId}
                  onClick={() => setSelected(row)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-gray-400">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                    {new Date(row.submittedAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="font-mono text-xs">
                      {(row.orderReference ?? row.orderId).slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.reviewerName ?? row.reviewerEmail ?? "Guest"}
                  </td>
                  <td className="px-4 py-3">
                    <Stars score={row.orderScore} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.restaurants.length}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.orderComment ? "Yes" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold text-gray-900">{start}</span>-
            <span className="font-semibold text-gray-900">{end}</span> of{" "}
            <span className="font-semibold text-gray-900">
              {pagination.total}
            </span>{" "}
            reviews
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
      )}

      <ReviewDetailModal review={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default ReviewsScreen;
