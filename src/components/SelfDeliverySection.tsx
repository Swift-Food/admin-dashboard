import { useState } from "react";
import cateringDeliveryService from "../services/catering-delivery.service";
import type { AdminDeliverySession } from "../types/catering-session.types";

const errText = (e: unknown): string =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() ??
  (e as Error).message ??
  "Request failed";

/**
 * Per-restaurant delivery method for one session. A restaurant marked
 * "delivers itself" is left out of the courier booking (its pickup and its
 * portions); when every restaurant delivers itself the session has no
 * courier at all and an admin marks it delivered here.
 */
const SelfDeliverySection = ({
  entry,
  onChanged,
}: {
  entry: AdminDeliverySession;
  onChanged: () => void;
}) => {
  const { session, activeBooking } = entry;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const status = session.deliveryStatus;
  const canChange =
    (status === "awaiting_booking" || status === "failed" || status === "self_delivery") && !activeBooking;
  const allSelf = status === "self_delivery";

  // One row per restaurant on the session, with its current method
  const restaurants = Array.from(
    new Map(
      (session.orderItems ?? []).map((item) => [
        item.restaurantId,
        item.restaurantName ||
          session.restaurantPickupAddresses?.[item.restaurantId]?.name ||
          item.restaurantId.slice(0, 8),
      ])
    ).entries()
  ).map(([restaurantId, name]) => ({
    restaurantId,
    name,
    self: session.restaurantFulfillment?.[restaurantId]?.method === "self",
  }));

  if (!canChange && !restaurants.some((r) => r.self)) return null;

  return (
    <div className="border border-teal-200 bg-teal-50/40 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Who delivers</h3>
        {allSelf ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
            No courier: restaurant delivers
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded px-3 py-2">{error}</div>
      ) : null}

      <ul className="space-y-2">
        {restaurants.map((r) => (
          <li key={r.restaurantId} className="text-xs text-gray-700">
            <div className="flex items-center gap-3">
              <span className="w-48 truncate font-semibold">{r.name}</span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold ${
                  r.self ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-700"
                }`}
              >
                {r.self ? "Delivers itself" : "Courier"}
              </span>
              {canChange && !r.self && editing !== r.restaurantId ? (
                <button
                  disabled={busy}
                  onClick={() => {
                    setEditing(r.restaurantId);
                    setAmount("");
                    setNote("");
                    setError(null);
                  }}
                  className="ml-auto px-3 py-1 rounded bg-white border border-teal-600 text-teal-700 font-semibold disabled:opacity-50"
                >
                  Set as self-delivery
                </button>
              ) : null}
              {canChange && r.self ? (
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Switch ${r.name} back to courier delivery? Any self-delivery payout added for it on this session will be removed.`
                      )
                    )
                      return;
                    run(async () => {
                      await cateringDeliveryService.revertRestaurantToCourier(session.id, r.restaurantId);
                      onChanged();
                    });
                  }}
                  className="ml-auto px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 font-semibold disabled:opacity-50"
                >
                  Back to courier
                </button>
              ) : null}
            </div>

            {editing === r.restaurantId ? (
              <div className="mt-2 ml-2 pl-3 border-l-2 border-teal-200 space-y-2">
                <p className="text-gray-700">
                  {r.name} will deliver its own food for this session, so the courier (if any) will not collect from it.
                  If Swift pays {r.name} for the delivery, enter the amount: it is added to their payout for this order
                  and shows on their payout receipt.
                </p>
                <label className="flex items-center gap-2">
                  <span>Pay for delivery £</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    placeholder="0.00"
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-24 border border-gray-300 rounded px-2 py-1"
                  />
                </label>
                <input
                  placeholder="Note for the payout line (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="block w-full border border-gray-300 rounded px-2 py-1"
                />
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy}
                    onClick={() => setEditing(null)}
                    className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await cateringDeliveryService.setRestaurantSelfDelivery(session.id, r.restaurantId, {
                          amount: Number(amount) || 0,
                          note: note.trim() || undefined,
                        });
                        setEditing(null);
                        onChanged();
                      })
                    }
                    className="ml-auto px-3 py-1.5 rounded bg-teal-600 text-white font-semibold disabled:opacity-50"
                  >
                    {Number(amount) > 0
                      ? `Confirm and pay £${Number(amount).toFixed(2)}`
                      : "Confirm (no payout)"}
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {allSelf ? (
        <div className="flex items-center gap-3 pt-1">
          <p className="text-xs text-gray-700">
            No courier is booked for this session. When the food has been delivered, mark it here.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await cateringDeliveryService.markDelivered(session.id);
                onChanged();
              })
            }
            className="ml-auto px-3 py-1.5 rounded bg-teal-600 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-50"
          >
            Mark as delivered
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SelfDeliverySection;
