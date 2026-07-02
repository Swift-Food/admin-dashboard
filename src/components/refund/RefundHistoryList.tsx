import { useEffect, useState } from "react";
import refundService, {
  type RefundRecord,
} from "../../services/refund.service";
import { RefundLineItem } from "./RefundLineItem";

interface Props {
  orderId: string;
  /** Bump this to trigger a reload — e.g. after issuing a new refund. */
  reloadToken?: number;
  restaurantView?: boolean;
  emptyMessage?: string;
  /**
   * If provided, only refunds matching this restaurant are shown. Used on
   * the restaurant partner dashboard so they don't see refunds against
   * other suppliers on the same order.
   */
  filterRestaurantId?: string;
}

export function RefundHistoryList({
  orderId,
  reloadToken = 0,
  restaurantView = false,
  emptyMessage = "No refunds issued on this order.",
  filterRestaurantId,
}: Props) {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    refundService
      .getForOrder(orderId)
      .then((list) => {
        if (cancelled) return;
        const filtered = filterRestaurantId
          ? list.filter((r) => r.restaurantId === filterRestaurantId)
          : list;
        setRefunds(filtered);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to load refund history",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, reloadToken, filterRestaurantId]);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 py-4">
        Loading refund history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        {error}
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic py-2">{emptyMessage}</div>
    );
  }

  return (
    <div className="space-y-3">
      {refunds.map((r) => (
        <RefundLineItem key={r.id} refund={r} restaurantView={restaurantView} />
      ))}
    </div>
  );
}
