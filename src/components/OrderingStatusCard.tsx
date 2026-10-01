import React, { useEffect, useState } from 'react';
import cateringSettingsService from '../services/catering-settings.service';

const CLOSE_CONFIRM = [
  'Close Swift to new orders?',
  '',
  'The website will show customers a notice that Swift has ceased operations, and no new orders can be placed (website, widget, partners).',
  '',
  'Existing orders, payments and restaurant/partner portals are not affected. You can reopen at any time.',
].join('\n');

const REOPEN_CONFIRM =
  'Reopen Swift to new orders? The closure notice will be removed from the website.';

/**
 * The "Swift is ceasing operations" switch on the admin home dashboard.
 * Reads and writes `orderingClosed` in catering settings; saves immediately
 * after a confirm, independent of any other settings form.
 */
const OrderingStatusCard: React.FC = () => {
  const [closed, setClosed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    cateringSettingsService
      .get()
      .then((res) => active && setClosed(res.settings.orderingClosed ?? false))
      .catch((err: unknown) =>
        active && setError(err instanceof Error ? err.message : 'Failed to load ordering status.'),
      );
    return () => {
      active = false;
    };
  }, []);

  if (closed === null && !error) return null;

  const toggle = async () => {
    if (closed === null) return;
    if (!window.confirm(closed ? REOPEN_CONFIRM : CLOSE_CONFIRM)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await cateringSettingsService.update({ orderingClosed: !closed });
      setClosed(res.settings.orderingClosed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const description = closed
    ? 'Swift is CLOSED to new orders. The website shows customers the ceasing-operations notice and new orders are refused.'
    : 'Swift is open. Ceasing operations replaces the website with a closure notice and refuses all new orders. Customers see it within about a minute.';
  const buttonLabel = closed ? 'Reopen to new orders' : 'Cease operations';
  const buttonClass = closed
    ? 'bg-[#051661] hover:opacity-90'
    : 'bg-red-600 hover:bg-red-700';

  return (
    <div
      className={`rounded-xl border bg-white p-5 flex items-center justify-between gap-4 flex-wrap ${
        closed ? 'border-red-500' : 'border-gray-200'
      }`}
    >
      <div className="max-w-2xl">
        <h2 className="text-base font-bold text-gray-900">Ordering status</h2>
        <p className="text-sm text-gray-500 mt-1">{error ?? description}</p>
      </div>
      {closed !== null ? (
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:bg-gray-400 ${buttonClass}`}
        >
          {saving ? 'Saving…' : buttonLabel}
        </button>
      ) : null}
    </div>
  );
};

export default OrderingStatusCard;
