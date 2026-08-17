import { useState } from "react";
import cateringDeliveryService from "../services/catering-delivery.service";
import type {
  AdminDeliverySession,
  BookableProvider,
  DeliveryPricePreview,
  PackageCounts,
} from "../types/catering-session.types";

const errText = (e: unknown): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  (e as Error).message ??
  "Request failed";

const PROVIDER_LABEL: Record<string, string> = {
  pedivan: "Pedivan",
  pedalme: "Pedal Me",
  swift: "Swift",
};

const BOOKING_STATE_BADGE: Record<string, string> = {
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-800",
};

/** Book / cancel / inspect the Pedivan courier for one meal session. */
const CourierBookingSection = ({
  entry,
  onChanged,
}: {
  entry: AdminDeliverySession;
  onChanged: () => void;
}) => {
  const { session, activeBooking, bookings, suggestedPackages, needsRebooking } = entry;
  const [packages, setPackages] = useState<PackageCounts>(
    activeBooking?.packages ?? suggestedPackages
  );
  const [pickupNotes, setPickupNotes] = useState("");
  const [dropNotes, setDropNotes] = useState("");
  const [price, setPrice] = useState<DeliveryPricePreview | null>(null);
  const [provider, setProvider] = useState<BookableProvider>("pedivan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);

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

  const canBook = session.deliveryStatus === "awaiting_booking" && !activeBooking;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Courier ({PROVIDER_LABEL[activeBooking?.provider ?? provider] ?? (activeBooking?.provider ?? provider)})</h3>
        {needsRebooking ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Details changed — rebook needed
          </span> : null}
      </div>

      {error ? <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded px-3 py-2">
          {error}
        </div> : null}

      {activeBooking ? <div className="text-xs space-y-1 bg-blue-50 border border-blue-200 rounded px-3 py-2">
          <p>
            <span className="font-semibold">Ref:</span>{" "}
            {activeBooking.externalReference ?? activeBooking.externalOrderId}
            {activeBooking.quotedPrice ? <span className="ml-2 font-semibold">
                {activeBooking.currency ?? "£"}
                {activeBooking.quotedPrice}
              </span> : null}
            {activeBooking.serviceTier && <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs">{activeBooking.serviceTier}</span>}
          </p>
          <p>
            <span className="font-semibold">Provider status:</span>{" "}
            {activeBooking.providerStatus ?? "—"} · pickup {activeBooking.pickupStatus ?? "—"} ·
            drop {activeBooking.dropStatus ?? "—"}
          </p>
          <p className="text-gray-500">
            Last webhook:{" "}
            {activeBooking.lastWebhookAt
              ? new Date(activeBooking.lastWebhookAt).toLocaleString()
              : `never (no updates from ${PROVIDER_LABEL[activeBooking.provider] ?? activeBooking.provider} yet)`}
          </p>
          <div className="flex gap-2 pt-1">
            {activeBooking.trackingUrl ? <a
                href={activeBooking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded bg-blue-600 text-white font-semibold"
              >
                Live tracking
              </a> : null}
            {activeBooking.provider !== "pedalme" && (
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const res = await cateringDeliveryService.getRiderLocation(activeBooking.id);
                    setRiderPos(res.location);
                  })
                }
                className="px-2 py-1 rounded bg-gray-200 text-gray-800 font-semibold disabled:opacity-50"
              >
                Where's the rider?
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`Cancel this courier booking with ${PROVIDER_LABEL[activeBooking.provider] ?? activeBooking.provider}?`)) return;
                run(async () => {
                  await cateringDeliveryService.cancelBooking(activeBooking.id);
                  onChanged();
                });
              }}
              className="px-2 py-1 rounded bg-red-600 text-white font-semibold disabled:opacity-50"
            >
              Cancel courier
            </button>
          </div>
          {activeBooking.provider === "pedalme" ? (
            activeBooking.riderPosition ? (
              <p>
                Rider at{" "}
                <a
                  href={`https://www.google.com/maps?q=${activeBooking.riderPosition.lat},${activeBooking.riderPosition.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline"
                >
                  {activeBooking.riderPosition.lat},{activeBooking.riderPosition.lng}
                </a>
                {activeBooking.riderEta && (
                  <>
                    {" "}
                    · ETA{" "}
                    {new Date(activeBooking.riderEta).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}{" "}
                <span className="text-gray-400">
                  (as of{" "}
                  {new Date(activeBooking.riderPosition.updatedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  )
                </span>
              </p>
            ) : (
              <p className="text-gray-500">Rider position arrives via Pedal Me updates once assigned.</p>
            )
          ) : riderPos ? (
            <p>
              Rider at{" "}
              <a
                href={`https://www.google.com/maps?q=${riderPos[0]},${riderPos[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline"
              >
                {riderPos[0].toFixed(5)}, {riderPos[1].toFixed(5)}
              </a>
            </p>
          ) : null}
        </div> : null}

      {canBook ? <div className="space-y-2">
          <label className="text-xs text-gray-700 block">
            Courier
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as BookableProvider);
                setPrice(null);
              }}
              className="mt-1 block w-40 border border-gray-300 rounded px-2 py-1"
            >
              <option value="pedivan">Pedivan</option>
              <option value="pedalme">Pedal Me</option>
            </select>
          </label>
          <div className="flex gap-3">
            {(["small", "medium", "large"] as const).map((size) => (
              <label key={size} className="text-xs text-gray-700">
                {size}
                <input
                  type="number"
                  min={0}
                  value={packages[size]}
                  onChange={(e) => {
                    setPrice(null);
                    setPackages({ ...packages, [size]: Math.max(0, Number(e.target.value)) });
                  }}
                  className="mt-1 block w-20 border border-gray-300 rounded px-2 py-1"
                />
              </label>
            ))}
          </div>
          <input
            placeholder="Pickup notes (optional)"
            value={pickupNotes}
            onChange={(e) => setPickupNotes(e.target.value)}
            className="block w-full border border-gray-300 rounded px-2 py-1 text-xs"
          />
          <input
            placeholder="Delivery notes (optional)"
            value={dropNotes}
            onChange={(e) => setDropNotes(e.target.value)}
            className="block w-full border border-gray-300 rounded px-2 py-1 text-xs"
          />
          <div className="flex items-center gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  setPrice(
                    await cateringDeliveryService.getPricePreview(session.id, packages, undefined, provider)
                  );
                })
              }
              className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-xs font-semibold disabled:opacity-50"
            >
              Get price
            </button>
            {price ? <span className="text-xs font-semibold text-gray-700">
                {price.currency}{price.price.toFixed(2)}{price.miles != null ? ` (${price.miles.toFixed(1)} mi)` : ""}
              </span> : null}
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await cateringDeliveryService.bookCourier(session.id, {
                    packages,
                    pickupNotes: pickupNotes || undefined,
                    dropNotes: dropNotes || undefined,
                    provider,
                  });
                  onChanged();
                })
              }
              className="ml-auto px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              Book courier
            </button>
          </div>
        </div> : null}

      {bookings.length > (activeBooking ? 1 : 0) && (
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-semibold">
            Booking history ({bookings.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                <span className="font-semibold">{PROVIDER_LABEL[b.provider] ?? b.provider}</span>
                <span className={`px-1.5 py-0.5 rounded ${BOOKING_STATE_BADGE[b.state] ?? ""}`}>
                  {b.state}
                </span>
                <span>{b.externalReference ?? b.externalOrderId}</span>
                <span className="text-gray-400">
                  {new Date(b.createdAt).toLocaleString()}
                  {b.cancelReason ? ` — ${b.cancelReason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default CourierBookingSection;
