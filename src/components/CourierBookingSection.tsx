import { useState } from "react";
import cateringDeliveryService, { isManualBooking } from "../services/catering-delivery.service";
import { Modal } from "./Modal";
import type {
  AdminDeliverySession,
  BookableProvider,
  CourierProviderInfo,
  DeliveryPricePreview,
  PackageCounts,
  ProviderExistingBooking,
} from "../types/catering-session.types";

/** "08 Sep, 17:15" — courier times, in the reader's own timezone. */
const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const errText = (e: unknown): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  (e as Error).message ??
  "Request failed";

/** Used only if the providers endpoint has not answered yet. */
const FALLBACK_PROVIDERS: CourierProviderInfo[] = [
  { key: "pedivan", label: "Pedivan", configured: true },
  { key: "pedalme", label: "Pedal Me", configured: true },
];

const PROVIDER_LABEL: Record<string, string> = {
  pedivan: "Pedivan",
  pedalme: "Pedal Me",
  swift: "Swift",
};

/** Pedal Me's official vehicle names for the wire values we send. */
const SERVICE_TIER_LABEL: Record<string, string> = {
  cargo: "Large Cargo",
  cargoSmall: "Small Cargo",
  cargoTiny: "Tiny Cargo",
  cargoMicro: "Micro Cargo",
  trailer: "Trailer",
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

/**
 * One line of the courier's published rules. We hold a full rate card for
 * Pedivan (hours, cut-offs, zones) but only tiers and a portion ceiling for
 * Pedal Me, so each half is rendered only when we actually have it.
 */
const rulesSummary = (rules: CourierProviderInfo["rules"]): string | null => {
  if (!rules) return null;
  const parts: string[] = [];

  const zone = rules.zones?.find((z) => z.postcodeDistricts !== null) ?? rules.zones?.[0];
  if (zone) {
    parts.push(`${zone.name}: ${zone.servicingOpen}–${zone.servicingClose}, book by ${zone.sameDayCutoff} on the day`);
  }
  if (rules.serviceLevels) {
    parts.push(`express when collection→delivery is under ${rules.serviceLevels.expressMaxWindowMinutes / 60}h`);
  }
  parts.push(`${rules.packaging.boxType} box per ${rules.packaging.portionsPerBox} portions`);
  if (rules.maxPortions) {
    parts.push(`over ${rules.maxPortions} portions Swift delivers it`);
  }
  return parts.length ? `${parts.join(", ")}.` : null;
};

/** One courier's answer for this job, gathered so the two can be read together. */
interface CourierQuote {
  provider: BookableProvider;
  quote: DeliveryPricePreview | null;
  /** Why this courier cannot be used, in their own words. */
  error?: string;
}

/** True when a quote carries a violation the courier will refuse outright. */
const isBlocked = (quote: DeliveryPricePreview | null): boolean =>
  !!quote?.constraints?.violations.some((v) => v.severity === "block");

/** "Tiny Cargo (up to 39 portions)" — the label for one vehicle choice. */
const tierOptionLabel = (tier: { label: string; service: string; maxPortions: number | null }): string =>
  tier.maxPortions ? `${tier.label} (up to ${tier.maxPortions} portions)` : tier.label;

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
  const { session, activeBooking, bookings, suggestedPackages, needsRebooking, suggestedPickupPhone } = entry;
  const [packages, setPackages] = useState<PackageCounts>(
    activeBooking?.packages ?? suggestedPackages
  );
  const [pickupNotes, setPickupNotes] = useState("");
  const [dropNotes, setDropNotes] = useState("");
  // Courier-only, never stored: the person the rider asks for, and a
  // number to reach them on when the restaurant record has none.
  const [pickupContactName, setPickupContactName] = useState("");
  // Prefilled with the restaurant's own number when we hold a usable one,
  // so there is only something to type when there genuinely isn't.
  const [pickupContactPhone, setPickupContactPhone] = useState(suggestedPickupPhone ?? "");
  // "" = let the courier's portion table pick the vehicle.
  const [serviceTier, setServiceTier] = useState("");
  const [price, setPrice] = useState<DeliveryPricePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);
  // A fresh quote fetched when "Book courier" is pressed; the booking only
  // goes ahead once it has been confirmed against this price.
  const [confirmQuote, setConfirmQuote] = useState<DeliveryPricePreview | null>(null);
  // What the same route would cost as same-day, when the quote is express.
  const [sameDayQuote, setSameDayQuote] = useState<DeliveryPricePreview | null>(null);
  // Prices from every courier for this exact job, so the cheaper one is a
  // reading rather than two rounds of quoting and remembering a number.
  const [comparison, setComparison] = useState<CourierQuote[] | null>(null);
  // Booking can go to a courier other than the one selected above — picking a
  // price is the decision, and the payload carries the provider.
  const [bookWith, setBookWith] = useState<BookableProvider>(provider);
  // The courier was booked on its own dashboard: look it up by id and attach
  // it, or (for couriers with no lookup API) record what the admin types.
  const [manualOpen, setManualOpen] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [found, setFound] = useState<ProviderExistingBooking | null>(null);
  const [manualRef, setManualRef] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualNotes, setManualNotes] = useState("");

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
  const manual = isManualBooking(activeBooking);
  // Ops moves a booking along by hand while the courier is sending us nothing —
  // a hand-recorded one, or a real booking whose updates have never arrived.
  const marksByHand = !!activeBooking && (manual || !activeBooking.lastWebhookAt);
  const providerKey = activeBooking?.provider ?? provider;
  const providerLabel = (key: string) =>
    providers.find((p) => p.key === key)?.label ?? PROVIDER_LABEL[key] ?? key;
  const providerConfigured = providers.length === 0 || providers.some((p) => p.key === provider && p.configured);
  // Only Pedal Me exposes an API for reading a booking back by its id.
  const canLookUp = provider === "pedalme";
  const providerRules = providers.find((p) => p.key === provider)?.rules;
  const rulesLine = rulesSummary(providerRules);
  const tiers = providerRules?.serviceTiers ?? [];
  const tierLabel = (key: string) =>
    tiers.find((t) => t.service === key)?.label ?? SERVICE_TIER_LABEL[key] ?? key;

  const quoteFor = (which: BookableProvider) =>
    cateringDeliveryService.getPricePreview(
      session.id,
      packages,
      undefined,
      which,
      undefined,
      // A vehicle choice belongs to the courier it was chosen for.
      which === provider ? serviceTier || undefined : undefined
    );
  const quoteCurrent = () => quoteFor(provider);

  /**
   * Ask every configured courier for this same job at once. Two round trips
   * and a remembered number was the old way to answer "which is cheaper".
   */
  const compareCouriers = async () => {
    const candidates: CourierProviderInfo[] = (
      providers.length ? providers : FALLBACK_PROVIDERS
    ).filter((p) => p.configured !== false);
    const results = await Promise.all(
      candidates.map(async (p): Promise<CourierQuote> => {
        try {
          return { provider: p.key, quote: await quoteFor(p.key) };
        } catch (e) {
          return { provider: p.key, quote: null, error: errText(e) };
        }
      })
    );
    setComparison(results);
    const cheapest = results
      .filter((r) => r.quote && !isBlocked(r.quote))
      .sort((a, b) => (a.quote!.price ?? 0) - (b.quote!.price ?? 0))[0];
    if (cheapest) {
      setBookWith(cheapest.provider);
      setPrice(cheapest.quote);
    }
  };

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
          {manual ? (
            <p className="text-amber-800 font-semibold">
              Handled manually — booked on {providerLabel(activeBooking.provider)}'s dashboard, so no automatic updates:
              mark pickup and delivery below.
            </p>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              <span className="font-semibold">
                {manual ? "Ref:" : `${providerLabel(activeBooking.provider)} booking ID:`}
              </span>{" "}
              {/* The courier's own id — what you quote them to change or chase a booking. */}
              <span className="font-mono select-all">
                {activeBooking.externalReference ?? (manual ? "not recorded" : activeBooking.externalOrderId)}
              </span>
            </span>
            {!manual ? (
              <button
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(activeBooking.externalReference ?? activeBooking.externalOrderId)
                    .catch(() => undefined)
                }
                className="px-1.5 py-0.5 rounded bg-white border border-blue-300 text-blue-800 font-semibold"
                title="Copy the courier's booking ID"
              >
                Copy
              </button>
            ) : null}
            {activeBooking.quotedPrice ? <span className="font-semibold">
                {activeBooking.currency ?? "£"}
                {activeBooking.quotedPrice}
              </span> : null}
            {activeBooking.serviceTier && <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs">{tierLabel(activeBooking.serviceTier)}</span>}
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
            {marksByHand && session.deliveryStatus === "booked" ? (
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await cateringDeliveryService.markPickedUp(session.id);
                    onChanged();
                  })
                }
                className="px-2 py-1 rounded bg-indigo-600 text-white font-semibold disabled:opacity-50"
              >
                Mark picked up
              </button>
            ) : null}
            {marksByHand && (session.deliveryStatus === "booked" || session.deliveryStatus === "out_for_delivery") ? (
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await cateringDeliveryService.markDelivered(session.id);
                    onChanged();
                  })
                }
                className="px-2 py-1 rounded bg-green-600 text-white font-semibold disabled:opacity-50"
              >
                Mark delivered
              </button>
            ) : null}
            <button
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    manual
                      ? "Remove this manual booking record? (Cancel it with the courier yourself — this only updates our system.)"
                      : `Cancel this courier booking with ${providerLabel(activeBooking.provider)}?`
                  )
                )
                  return;
                run(async () => {
                  await cateringDeliveryService.cancelBooking(activeBooking.id);
                  onChanged();
                });
              }}
              className="px-2 py-1 rounded bg-red-600 text-white font-semibold disabled:opacity-50"
            >
              {manual ? "Remove booking" : "Cancel courier"}
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

          {/* Already booked on the courier's dashboard: pull it in by its id. */}
          <div className="border border-amber-200 bg-amber-50/50 rounded px-3 py-2 text-xs space-y-2">
            {!manualOpen ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-700">
                  Already booked this on {providerLabel(provider)}'s own dashboard?
                </span>
                <button
                  disabled={busy}
                  onClick={() => setManualOpen(true)}
                  className="px-3 py-1 rounded bg-white border border-amber-600 text-amber-800 font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  {canLookUp ? "Link it by booking ID…" : "Record it by hand…"}
                </button>
              </div>
            ) : canLookUp ? (
              <>
                <p className="text-gray-700">
                  Paste the <span className="font-semibold">booking ID</span> from{" "}
                  <span className="font-semibold">{providerLabel(provider)}</span> — not the order number — and we
                  fetch the rest: price, vehicle, times and tracking. Their updates then come through automatically,
                  so you never have to mark pickup or delivery by hand.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-gray-700 flex-1 min-w-[220px]">
                    {providerLabel(provider)} booking ID
                    <span className="ml-1 font-normal text-gray-500">
                      — e.g. uixfp2p3J5eQ23Kr4
                    </span>
                    <input
                      value={lookupId}
                      onChange={(e) => {
                        setLookupId(e.target.value);
                        setFound(null);
                      }}
                      placeholder="e.g. uixfp2p3J5eQ23Kr4"
                      className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 font-mono"
                    />
                    <span className="mt-1 block text-gray-500">
                      Open the booking on {providerLabel(provider)} — the ID is the code at the end of its web address.
                    </span>
                  </label>
                  <button
                    disabled={busy || !lookupId.trim()}
                    onClick={() =>
                      run(async () => {
                        setFound(
                          await cateringDeliveryService.lookupProviderBooking(provider, lookupId.trim())
                        );
                      })
                    }
                    className="px-3 py-1.5 rounded bg-white border border-amber-600 text-amber-800 font-semibold disabled:opacity-50"
                  >
                    {busy ? "Looking up…" : "Look up"}
                  </button>
                </div>

                {found ? (
                  <div className="bg-white border border-gray-200 rounded px-3 py-2 space-y-1">
                    <p className="font-semibold text-gray-800">
                      Found on {providerLabel(provider)} — {found.providerStatus}
                    </p>
                    <p className="text-gray-700">
                      {found.price != null ? (
                        <span className="font-semibold">
                          {found.currency}
                          {found.price.toFixed(2)}
                        </span>
                      ) : (
                        "no price yet"
                      )}
                      {found.serviceTier ? ` · ${tierLabel(found.serviceTier)}` : ""}
                      {found.orderReference ? ` · order ${found.orderReference}` : ""}
                    </p>
                    {found.startDate || found.endDate ? (
                      <p className="text-gray-600">
                        {found.startDate ? `Collect ${formatWhen(found.startDate)}` : ""}
                        {found.endDate ? ` · deliver by ${formatWhen(found.endDate)}` : ""}
                      </p>
                    ) : null}
                    {found.pickupAddress ? <p className="text-gray-500">From {found.pickupAddress}</p> : null}
                    {found.dropAddress ? <p className="text-gray-500">To {found.dropAddress}</p> : null}
                    {!found.isConfirmed ? (
                      <p className="text-amber-800 font-semibold">
                        This is still {found.providerStatus} on {providerLabel(provider)} — confirm it there first.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <button
                    disabled={busy}
                    onClick={() => {
                      setManualOpen(false);
                      setFound(null);
                    }}
                    className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy || !found?.isConfirmed}
                    onClick={() =>
                      run(async () => {
                        await cateringDeliveryService.linkExistingBooking(session.id, {
                          provider,
                          externalOrderId: lookupId.trim(),
                        });
                        setManualOpen(false);
                        setFound(null);
                        onChanged();
                      })
                    }
                    className="ml-auto px-3 py-1.5 rounded bg-amber-600 text-white font-semibold disabled:opacity-50"
                  >
                    {found?.isConfirmed
                      ? `Attach this booking${found.price != null ? ` (${found.currency}${found.price.toFixed(2)})` : ""}`
                      : "Look it up first"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-700">
                  Record a booking you made on <span className="font-semibold">{providerLabel(provider)}</span>'s dashboard.
                  {providerLabel(provider)} has no API for reading a booking back, so type what you have. Nothing is sent
                  to the courier, and you mark pickup and delivery here when they happen.
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="text-gray-700">
                    Courier reference
                    <input
                      value={manualRef}
                      onChange={(e) => setManualRef(e.target.value)}
                      placeholder="e.g. PV-12345"
                      className="mt-1 block w-40 border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="text-gray-700">
                    Price £
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 block w-24 border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="text-gray-700 flex-1 min-w-[200px]">
                    Notes
                    <input
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="optional"
                      className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy}
                    onClick={() => setManualOpen(false)}
                    className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await cateringDeliveryService.recordManualBooking(session.id, {
                          provider,
                          reference: manualRef.trim() || undefined,
                          price: manualPrice ? Number(manualPrice) : undefined,
                          notes: manualNotes.trim() || undefined,
                        });
                        setManualOpen(false);
                        onChanged();
                      })
                    }
                    className="ml-auto px-3 py-1.5 rounded bg-amber-600 text-white font-semibold disabled:opacity-50"
                  >
                    Record as booked with {providerLabel(provider)}
                    {manualPrice ? ` for £${Number(manualPrice).toFixed(2)}` : ""}
                  </button>
                </div>
              </>
            )}
          </div>
          {!providerConfigured ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded px-3 py-2">
              {providerLabel(provider)} is not set up yet (no API credentials on the server), so quotes and bookings with it will fail.
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-3">
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
            {/* Vehicle choice, for couriers that offer one (Pedal Me's cargo bikes). */}
            {tiers.length > 0 ? (
              <label className="text-xs text-gray-700">
                vehicle
                <select
                  value={serviceTier}
                  onChange={(e) => {
                    setPrice(null);
                    setServiceTier(e.target.value);
                  }}
                  className="mt-1 block border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="">Automatic (from portions)</option>
                  {tiers.map((tier) => (
                    <option key={tier.service} value={tier.service}>
                      {tierOptionLabel(tier)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <input
            placeholder="Pickup notes (optional)"
            value={pickupNotes}
            onChange={(e) => setPickupNotes(e.target.value)}
            className="block w-full border border-gray-300 rounded px-2 py-1 text-xs"
          />
          {/* Who the rider asks for. We only hold the business name, so this is
              typed per booking rather than kept on the restaurant. */}
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Pickup contact name (optional)"
              value={pickupContactName}
              onChange={(e) => setPickupContactName(e.target.value)}
              className="flex-1 min-w-[160px] block border border-gray-300 rounded px-2 py-1 text-xs"
            />
            <input
              placeholder={
                suggestedPickupPhone
                  ? "Pickup contact phone"
                  : "Pickup contact phone — none on file, please add one"
              }
              value={pickupContactPhone}
              onChange={(e) => setPickupContactPhone(e.target.value)}
              className="flex-1 min-w-[160px] block border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <input
            placeholder="Delivery notes (optional)"
            value={dropNotes}
            onChange={(e) => setDropNotes(e.target.value)}
            className="block w-full border border-gray-300 rounded px-2 py-1 text-xs"
          />
          <ViolationList quote={price} />

          {comparison ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {comparison
                .slice()
                .sort((a, b) => (a.quote?.price ?? Infinity) - (b.quote?.price ?? Infinity))
                .map((row, index) => {
                  const usable = !!row.quote && !isBlocked(row.quote);
                  const cheapest = index === 0 && usable;
                  return (
                    <div
                      key={row.provider}
                      className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 border-gray-100 ${
                        row.provider === bookWith ? "bg-indigo-50/60" : "bg-white"
                      }`}
                    >
                      <span className="font-semibold text-gray-800 w-24">{providerLabel(row.provider)}</span>
                      {row.quote ? (
                        <>
                          <span className="font-bold text-gray-900">
                            {row.quote.currency}
                            {row.quote.price.toFixed(2)}
                          </span>
                          {row.quote.isExpress != null ? (
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                row.quote.isExpress ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                              }`}
                            >
                              {row.quote.isExpress ? "express" : "same-day"}
                            </span>
                          ) : null}
                          {cheapest ? (
                            <span className="px-1.5 py-0.5 rounded bg-green-600 text-white font-semibold">cheapest</span>
                          ) : null}
                          {!usable ? (
                            <span className="text-red-700">cannot take this job</span>
                          ) : null}
                          <button
                            disabled={busy || !usable}
                            onClick={() => {
                              setBookWith(row.provider);
                              setPrice(row.quote);
                            }}
                            className={`ml-auto px-2 py-1 rounded font-semibold disabled:opacity-40 ${
                              row.provider === bookWith
                                ? "bg-indigo-600 text-white"
                                : "bg-white border border-indigo-500 text-indigo-700"
                            }`}
                          >
                            {row.provider === bookWith ? "Selected" : "Use this"}
                          </button>
                        </>
                      ) : (
                        <span className="text-red-700">{row.error ?? "no price"}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  setComparison(null);
                  setBookWith(provider);
                  setPrice(await quoteCurrent());
                })
              }
              className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-xs font-semibold disabled:opacity-50"
            >
              Get price
            </button>
            <button
              disabled={busy}
              onClick={() => run(compareCouriers)}
              className="px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-800 text-xs font-semibold disabled:opacity-50"
              title="Quote every courier for this job at once"
            >
              {busy ? "Quoting…" : "Compare couriers"}
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
                  const quote = await quoteFor(bookWith);
                  let sameDay: DeliveryPricePreview | null = null;
                  if (quote.isExpress) {
                    try {
                      sameDay = await cateringDeliveryService.getPricePreview(
                        session.id,
                        packages,
                        undefined,
                        bookWith,
                        false,
                        bookWith === provider ? serviceTier || undefined : undefined
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
              This creates a real booking with {providerLabel(bookWith)}. Check the details first.
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
                <dd className="font-medium">{providerLabel(bookWith)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Boxes</dt>
                <dd className="font-medium">{boxSummary(packages)}</dd>
              </div>
              {tiers.length > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Vehicle</dt>
                  <dd className="font-medium">
                    {serviceTier ? tierLabel(serviceTier) : "Automatic (from portions)"}
                  </dd>
                </div>
              ) : null}
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
              {pickupContactName || pickupContactPhone ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Pickup contact</dt>
                  <dd className="font-medium text-right">
                    {[pickupContactName, pickupContactPhone].filter(Boolean).join(" · ")}
                  </dd>
                </div>
              ) : null}
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
                      pickupContactName: pickupContactName.trim() || undefined,
                      pickupContactPhone: pickupContactPhone.trim() || undefined,
                      provider: bookWith,
                      serviceTier: bookWith === provider ? serviceTier || undefined : undefined,
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
