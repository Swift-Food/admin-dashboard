import { useState } from "react";
import cateringDeliveryService from "../services/catering-delivery.service";
import { Modal } from "./Modal";
import type {
  AdminDeliverySession,
  BookableProvider,
  CourierProviderInfo,
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

const boxSummary = (p: PackageCounts): string =>
  (["small", "medium", "large"] as const)
    .filter((size) => p[size] > 0)
    .map((size) => `${p[size]} ${size}`)
    .join(", ") || "no boxes";

/** The courier's rules that a quote says this booking breaks (the backend holds the rules). */
const ViolationList = ({
  quote,
  className = "",
}: {
  quote: DeliveryPricePreview | null;
  className?: string;
}) => {
  const violations = quote?.constraints?.violations ?? [];
  if (violations.length === 0) return null;
  return (
    <>
      {violations.map((v) => (
        <div
          key={v.code + v.message}
          className={`${className} text-xs rounded px-3 py-2 border ${
            v.severity === "block"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          {v.message}
        </div>
      ))}
    </>
  );
};

/** One line of the courier's published rules, from the backend's rule set. */
const rulesSummary = (rules: CourierProviderInfo["rules"]): string | null => {
  if (!rules) return null;
  const zone = rules.zones.find((z) => z.postcodeDistricts !== null) ?? rules.zones[0];
  if (!zone) return null;
  const expressH = rules.serviceLevels.expressMaxWindowMinutes / 60;
  return `${zone.name}: ${zone.servicingOpen}–${zone.servicingClose}, book by ${zone.sameDayCutoff} on the day, express when collection→delivery is under ${expressH}h, ${rules.packaging.boxType} box per ${rules.packaging.portionsPerBox} portions.`;
};

/** Book / cancel / inspect the courier for one meal session. */
const CourierBookingSection = ({
  entry,
  onChanged,
  provider,
  providers,
}: {
  entry: AdminDeliverySession;
  onChanged: () => void;
  provider: BookableProvider;
  providers: CourierProviderInfo[];
}) => {
  const { session, activeBooking, bookings, suggestedPackages, needsRebooking } = entry;
  const [packages, setPackages] = useState<PackageCounts>(
    activeBooking?.packages ?? suggestedPackages
  );
  const [pickupNotes, setPickupNotes] = useState("");
  const [dropNotes, setDropNotes] = useState("");
  const [price, setPrice] = useState<DeliveryPricePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);
  // A fresh quote fetched when "Book courier" is pressed; the booking only
  // goes ahead once it has been confirmed against this price.
  const [confirmQuote, setConfirmQuote] = useState<DeliveryPricePreview | null>(null);
  // What the same route would cost as same-day, when the quote is express.
  const [sameDayQuote, setSameDayQuote] = useState<DeliveryPricePreview | null>(null);

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
  const providerKey = activeBooking?.provider ?? provider;
  const providerLabel = (key: string) =>
    providers.find((p) => p.key === key)?.label ?? PROVIDER_LABEL[key] ?? key;
  const providerConfigured = providers.length === 0 || providers.some((p) => p.key === provider && p.configured);
  const rulesLine = rulesSummary(providers.find((p) => p.key === provider)?.rules);

  const quoteCurrent = () =>
    cateringDeliveryService.getPricePreview(session.id, packages, undefined, provider);

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Courier ({providerLabel(providerKey)})</h3>
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
              : `never (no updates from ${providerLabel(activeBooking.provider)} yet)`}
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
            {/* Poll button only for providers with a location endpoint (pedivan). */}
            {activeBooking.provider === "pedivan" && (
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
                if (!window.confirm(`Cancel this courier booking with ${providerLabel(activeBooking.provider)}?`)) return;
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
          {/* Stored position is capability-keyed: any provider that pushes rider
              telemetry renders here; the per-provider hint covers the gap. */}
          {activeBooking.riderPosition ? (
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
          ) : activeBooking.provider === "pedalme" ? (
            <p className="text-gray-500">Rider position arrives via Pedal Me updates once assigned.</p>
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
          <p className="text-xs text-gray-500">
            Booking with <span className="font-semibold text-gray-700">{providerLabel(provider)}</span> — change the
            courier company in "Who delivers" above. Boxes are pre-filled from the portions; adjust if needed.
          </p>
          {rulesLine ? <p className="text-xs text-gray-500">{rulesLine}</p> : null}
          {!providerConfigured ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded px-3 py-2">
              {providerLabel(provider)} is not set up yet (no API credentials on the server), so quotes and bookings with it will fail.
            </div>
          ) : null}
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
          <ViolationList quote={price} />
          <div className="flex items-center gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  setPrice(await quoteCurrent());
                })
              }
              className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-xs font-semibold disabled:opacity-50"
            >
              Get price
            </button>
            {price ? <span className="text-xs font-semibold text-gray-700">
                {price.currency}{price.price.toFixed(2)}{price.miles != null ? ` (${price.miles.toFixed(1)} mi)` : ""}
                {price.isExpress != null ? (
                  <span className={`ml-2 px-1.5 py-0.5 rounded ${price.isExpress ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                    {price.isExpress ? "express" : "same-day"}
                  </span>
                ) : null}
              </span> : null}
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  // Always quote the boxes/provider as they are right now, then ask.
                  const quote = await quoteCurrent();
                  let sameDay: DeliveryPricePreview | null = null;
                  if (quote.isExpress) {
                    try {
                      sameDay = await cateringDeliveryService.getPricePreview(
                        session.id,
                        packages,
                        undefined,
                        provider,
                        false
                      );
                    } catch {
                      sameDay = null;
                    }
                  }
                  setPrice(quote);
                  setSameDayQuote(sameDay);
                  setConfirmQuote(quote);
                })
              }
              className="ml-auto px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              Book courier...
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
                <span className="font-semibold">{providerLabel(b.provider)}</span>
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

      {/* Booking confirmation: nothing is sent to the courier until this is accepted */}
      <Modal open={!!confirmQuote} onClose={() => { if (!busy) setConfirmQuote(null); }} overlayOpacity={60}>
        {confirmQuote ? (
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-lg font-bold mb-1 text-gray-900">Book this courier?</h3>
            <p className="text-xs text-gray-500 mb-4">
              This creates a real booking with {providerLabel(provider)}. Check the details first.
            </p>

            <dl className="text-sm text-gray-800 space-y-2 mb-4">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Price</dt>
                <dd className="font-bold text-gray-900 text-base">
                  {confirmQuote.currency}
                  {confirmQuote.price.toFixed(2)}
                  {confirmQuote.miles != null ? (
                    <span className="ml-1 text-xs font-normal text-gray-500">({confirmQuote.miles.toFixed(1)} mi)</span>
                  ) : null}
                </dd>
              </div>
              {confirmQuote.isExpress != null ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Service</dt>
                  <dd className="font-medium text-right">
                    {confirmQuote.isExpress ? "Express" : "Same-day"}
                    {confirmQuote.constraints?.zone ? ` · ${confirmQuote.constraints.zone}` : ""}
                    {confirmQuote.windowMinutes != null ? (
                      <span className="block text-xs font-normal text-gray-500">
                        {confirmQuote.windowMinutes} min between collection and delivery
                        {confirmQuote.isExpress ? " (under 2h)" : ""}
                      </span>
                    ) : null}
                    {confirmQuote.constraints?.fareEstimate != null &&
                    Math.abs(confirmQuote.constraints.fareEstimate - confirmQuote.price) > 1 ? (
                      <span className="block text-xs font-normal text-amber-700">
                        Our estimate was {confirmQuote.currency}
                        {confirmQuote.constraints.fareEstimate.toFixed(2)} — their tariff may have changed
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Courier</dt>
                <dd className="font-medium">{providerLabel(provider)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Boxes</dt>
                <dd className="font-medium">{boxSummary(packages)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Session</dt>
                <dd className="font-medium text-right">
                  {session.sessionName} · {new Date(session.sessionDate).toLocaleDateString("en-GB")}
                  {session.collectionTime ? ` · collect ${session.collectionTime}` : ""}
                  {session.eventTime ? ` · deliver ${session.eventTime}` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Pickup</dt>
                <dd className="font-medium text-right">
                  {Object.values(session.restaurantPickupAddresses ?? {})
                    .map((a) => a.name)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Drop</dt>
                <dd className="font-medium text-right">{session.cateringOrder?.deliveryAddress || "—"}</dd>
              </div>
              {pickupNotes || dropNotes ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-right text-xs">
                    {pickupNotes ? <div>Pickup: {pickupNotes}</div> : null}
                    {dropNotes ? <div>Delivery: {dropNotes}</div> : null}
                  </dd>
                </div>
              ) : null}
            </dl>

            {confirmQuote.isExpress && sameDayQuote ? (
              <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded px-3 py-2">
                Express because collection is under 2 hours before delivery. The same route as same-day would be{" "}
                <span className="font-semibold">
                  {sameDayQuote.currency}
                  {sameDayQuote.price.toFixed(2)}
                </span>{" "}
                — move the collection time to 2+ hours before delivery if that works for the food.
              </div>
            ) : null}

            <ViolationList quote={confirmQuote} className="mb-3" />

            {error ? (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded px-3 py-2">{error}</div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmQuote(null)}
                disabled={busy}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  run(async () => {
                    await cateringDeliveryService.bookCourier(session.id, {
                      packages,
                      pickupNotes: pickupNotes || undefined,
                      dropNotes: dropNotes || undefined,
                      provider,
                    });
                    setConfirmQuote(null);
                    onChanged();
                  })
                }
                disabled={busy || confirmQuote.constraints?.violations.some((v) => v.severity === "block")}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {busy
                  ? "Booking..."
                  : confirmQuote.constraints?.violations.some((v) => v.severity === "block")
                    ? "Cannot book: fix the times first"
                    : `Yes, book for ${confirmQuote.currency}${confirmQuote.price.toFixed(2)}`}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default CourierBookingSection;
