import React, { useCallback, useEffect, useMemo, useState } from 'react';
import commissionInvoicesService from '../../services/commission-invoices.service';
import type {
  CommissionDispatch,
  CommissionInvoiceMonth,
  CommissionInvoiceRow,
} from '../../services/commission-invoices.service';
import cateringSettingsService from '../../services/catering-settings.service';

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const TH: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  padding: '8px 10px',
  borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#111827',
  padding: '10px',
  borderBottom: '1px solid #f3f4f6',
};
const TD_R: React.CSSProperties = { ...TD, textAlign: 'right', whiteSpace: 'nowrap' };

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#4b5563',
  marginBottom: 4,
};
const INPUT: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: '0.9rem',
};

const money = (n: number | undefined) => `£${Number(n || 0).toFixed(2)}`;

/** Month input value (YYYY-MM) for the month before `now` — what a run bills. */
const previousMonthValue = (now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const currentMonthValue = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const parseMonthValue = (value: string): { year: number; month: number } | null => {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
};

const errorText = async (e: unknown): Promise<string> => {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return String(parsed.message ?? 'Request failed.');
    } catch {
      return 'Request failed.';
    }
  }
  const message = (data as { message?: string | string[] })?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (message) return String(message);
  return e instanceof Error ? e.message : 'Request failed.';
};

const openBlobInTab = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  // Revoke late so the new tab has time to load the document.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  sent: { background: '#dcfce7', color: '#166534' },
  empty: { background: '#f3f4f6', color: '#4b5563' },
  failed: { background: '#fee2e2', color: '#991b1b' },
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span
    style={{
      ...(STATUS_STYLE[status] ?? STATUS_STYLE.empty),
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: '0.72rem',
      fontWeight: 700,
      textTransform: 'uppercase',
    }}
  >
    {status}
  </span>
);

const CommissionInvoicesScreen: React.FC = () => {
  const [monthValue, setMonthValue] = useState(previousMonthValue());
  const [data, setData] = useState<CommissionInvoiceMonth | null>(null);
  const [dispatches, setDispatches] = useState<CommissionDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recipient settings live in the shared catering settings row.
  const [recipient, setRecipient] = useState('');
  const [cc, setCc] = useState('');
  const [sendDay, setSendDay] = useState(5);
  const [enabled, setEnabled] = useState(true);
  const [redirectEnabled, setRedirectEnabled] = useState(true);
  const [redirectTo, setRedirectTo] = useState('');
  const [savedRecipients, setSavedRecipients] = useState('');

  const period = useMemo(() => parseMonthValue(monthValue), [monthValue]);

  const loadDispatches = useCallback(async () => {
    try {
      setDispatches(await commissionInvoicesService.getDispatches(24));
    } catch {
      /* history is supplementary — a failure here shouldn't blank the page */
    }
  }, []);

  const load = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await commissionInvoicesService.getMonth(period.year, period.month);
      setData(res);
      setRecipient(res.recipients.recipient);
      setCc(res.recipients.cc);
      setSendDay(res.recipients.sendDay);
      setEnabled(res.recipients.enabled);
      setRedirectEnabled(res.recipients.redirectEnabled);
      setRedirectTo(res.recipients.redirectTo);
      setSavedRecipients(
        JSON.stringify([
          res.recipients.recipient,
          res.recipients.cc,
          res.recipients.sendDay,
          res.recipients.enabled,
          res.recipients.redirectEnabled,
          res.recipients.redirectTo,
        ]),
      );
    } catch (e) {
      setData(null);
      setMessage({ type: 'error', text: await errorText(e) });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadDispatches();
  }, [loadDispatches]);

  const recipientsState = JSON.stringify([
    recipient,
    cc,
    sendDay,
    enabled,
    redirectEnabled,
    redirectTo,
  ]);
  const recipientsDirty = savedRecipients !== recipientsState;

  const handleSaveRecipients = async () => {
    setBusy('settings');
    setMessage(null);
    try {
      await cateringSettingsService.update({
        commissionInvoiceEmailEnabled: enabled,
        commissionInvoiceRecipient: recipient.trim(),
        commissionInvoiceCc: cc.trim(),
        commissionInvoiceSendDay: sendDay,
        commissionInvoiceRedirectEnabled: redirectEnabled,
        commissionInvoiceRedirectTo: redirectTo.trim(),
      });
      setSavedRecipients(recipientsState);
      setMessage({ type: 'success', text: 'Recipients saved. Applies to the next monthly send.' });
    } catch (e) {
      setMessage({ type: 'error', text: await errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async () => {
    if (!period || !data) return;
    // Mirror the backend's precedence: the redirect wins over the saved
    // recipients, so the dialog can never promise a send that won't happen.
    const to = redirectEnabled
      ? `${redirectTo} (TEST — redirect is on, ${recipient || 'the bookkeeper'} will not receive it)`
      : [recipient, cc].filter(Boolean).join(', ');
    const alreadySent = data.lastDispatch?.status === 'sent';
    const confirmText = alreadySent
      ? `${data.periodLabel} was already sent on ${new Date(
          data.lastDispatch!.createdAt,
        ).toLocaleString('en-GB')}.\n\nSend it again to ${to}?`
      : `Send ${data.totals.invoiceCount} commission invoice(s) for ${data.periodLabel} to ${to}?`;
    if (!window.confirm(confirmText)) return;

    setBusy('send');
    setMessage(null);
    try {
      const result = await commissionInvoicesService.send(period.year, period.month);
      if (result.status === 'sent') {
        setMessage({
          type: 'success',
          text: `Sent ${result.invoiceCount} invoice(s) for ${result.periodLabel} to ${result.recipient}.`,
        });
      } else if (result.status === 'empty') {
        setMessage({ type: 'error', text: `Nothing to send for ${result.periodLabel}.` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Send failed.' });
      }
      await Promise.all([load(), loadDispatches()]);
    } catch (e) {
      setMessage({ type: 'error', text: await errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const withDoc = async (key: string, run: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await run();
    } catch (e) {
      setMessage({ type: 'error', text: await errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const handleView = (row: CommissionInvoiceRow) =>
    withDoc(`html:${row.restaurantId}`, async () => {
      if (!period) return;
      openBlobInTab(
        await commissionInvoicesService.getInvoiceHtml(row.restaurantId, period.year, period.month),
      );
    });

  const handlePdf = (row: CommissionInvoiceRow) =>
    withDoc(`pdf:${row.restaurantId}`, async () => {
      if (!period) return;
      const blob = await commissionInvoicesService.getInvoicePdf(
        row.restaurantId,
        period.year,
        period.month,
      );
      downloadBlob(blob, `${row.invoiceSerial ?? 'commission-invoice'}.pdf`);
    });

  const handleCsv = () =>
    withDoc('csv', async () => {
      if (!period) return;
      const blob = await commissionInvoicesService.getMonthCsv(period.year, period.month);
      downloadBlob(blob, `commission-summary_${monthValue}.csv`);
    });

  const included = data?.rows.filter((r) => r.included) ?? [];
  const excluded = data?.rows.filter((r) => !r.included) ?? [];
  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const recipientValid = isEmail(recipient);
  const redirectValid = isEmail(redirectTo);
  // While the redirect is on it's the redirect address that has to be valid —
  // that's where the pack is actually going.
  const canSend = redirectEnabled ? redirectValid : recipientValid;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#051661', marginBottom: 6 }}>
        Commission Invoices
      </h1>
      <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: 20, maxWidth: 760 }}>
        One commission tax invoice per restaurant per month, covering orders <strong>delivered</strong>{' '}
        in the period (event date, not order date). The previous month's pack is emailed to the
        bookkeeper automatically — this is what gets sent.
      </p>

      {redirectEnabled ? (
        <div
          style={{
            ...CARD,
            padding: '14px 18px',
            background: '#fef2f2',
            borderColor: '#fecaca',
            color: '#7f1d1d',
            fontSize: '0.85rem',
          }}
        >
          <strong>Test mode — invoices are being redirected.</strong> The monthly pack is going to{' '}
          <strong>{redirectTo || '(not set)'}</strong> instead of{' '}
          <strong>{recipient || '(no recipient set)'}</strong>, and CC is suppressed. Turn off{' '}
          “Redirect for testing” below when you're ready to go live — the real address is already
          saved, nothing to re-enter.
        </div>
      ) : null}

      {message ? (
        <div
          style={{
            ...CARD,
            padding: '12px 16px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            borderColor: message.type === 'success' ? '#a7f3d0' : '#fecaca',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.85rem',
          }}
        >
          {message.text}
        </div>
      ) : null}

      {/* ── Month + actions ─────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={LABEL} htmlFor="commission-month">
              Invoice month
            </label>
            <input
              id="commission-month"
              type="month"
              value={monthValue}
              max={currentMonthValue()}
              onChange={(e) => setMonthValue(e.target.value)}
              style={{ ...INPUT, width: 180, color: '#000' }}
            />
          </div>
          <button
            type="button"
            onClick={() => setMonthValue(previousMonthValue())}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            Last month
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleCsv}
            disabled={busy !== null || included.length === 0}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#374151',
              cursor: included.length === 0 ? 'not-allowed' : 'pointer',
              opacity: included.length === 0 ? 0.5 : 1,
            }}
          >
            {busy === 'csv' ? 'Preparing…' : 'Download CSV'}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={busy !== null || included.length === 0 || !canSend}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: included.length === 0 || !canSend ? '#c7b3f0' : '#7c3aed',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: included.length === 0 || !canSend ? 'not-allowed' : 'pointer',
            }}
          >
            {busy === 'send' ? 'Sending…' : 'Send to bookkeeper now'}
          </button>
        </div>

        {data ? (
          <div style={{ display: 'flex', gap: 28, marginTop: 18, flexWrap: 'wrap' }}>
            {[
              ['Invoices', String(data.totals.invoiceCount)],
              ['Order value', money(data.totals.totalOrderValue)],
              ['Commission net', money(data.totals.totalNetCommission)],
              ['Commission VAT', money(data.totals.totalCommissionVat)],
              ...(data.totals.totalRefunds > 0
                ? [['Refunds', money(data.totals.totalRefunds)] as [string, string]]
                : []),
              ['Invoice total', money(data.totals.invoiceTotal)],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  {label}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#051661' }}>{value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {data?.lastDispatch ? (
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 16, marginBottom: 0 }}>
            Last attempt for {data.periodLabel}: <StatusPill status={data.lastDispatch.status} />{' '}
            {new Date(data.lastDispatch.createdAt).toLocaleString('en-GB')} ({data.lastDispatch.trigger})
            {data.lastDispatch.error ? ` — ${data.lastDispatch.error}` : ''}
          </p>
        ) : data ? (
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 16, marginBottom: 0 }}>
            {data.periodLabel} has not been sent yet.
          </p>
        ) : null}
      </div>

      {/* ── The batch ───────────────────────────────────────────────── */}
      <div style={CARD}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#051661', margin: '0 0 12px' }}>
          {data ? data.periodLabel : 'Invoices'}
        </h2>

        {loading ? <p style={{ color: '#6b7280' }}>Loading…</p> : null}

        {!loading && included.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
            No commission invoices for this month.
          </p>
        ) : null}

        {!loading && included.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={TH}>Invoice No</th>
                  <th style={TH}>Restaurant</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Rate</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Order lines</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Order value</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Net</th>
                  <th style={{ ...TH, textAlign: 'right' }}>VAT</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  <th style={TH} />
                </tr>
              </thead>
              <tbody>
                {included.map((row) => (
                  <tr key={row.restaurantId}>
                    <td style={{ ...TD, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {row.invoiceSerial}
                    </td>
                    <td style={TD}>{row.restaurantName}</td>
                    <td style={TD_R}>{row.commissionRate}%</td>
                    <td style={TD_R}>{row.orderCount}</td>
                    <td style={TD_R}>{money(row.totalOrderValue)}</td>
                    <td style={TD_R}>{money(row.totalNetCommission)}</td>
                    <td style={TD_R}>{money(row.totalCommissionVat)}</td>
                    <td style={{ ...TD_R, fontWeight: 700 }}>{money(row.invoiceTotal)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleView(row)}
                        disabled={busy !== null}
                        style={{
                          marginRight: 8,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePdf(row)}
                        disabled={busy !== null}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...TD, fontWeight: 700 }} colSpan={3}>
                    Total
                  </td>
                  <td style={{ ...TD_R, fontWeight: 700 }}>{data?.totals.orderCount}</td>
                  <td style={{ ...TD_R, fontWeight: 700 }}>{money(data?.totals.totalOrderValue)}</td>
                  <td style={{ ...TD_R, fontWeight: 700 }}>{money(data?.totals.totalNetCommission)}</td>
                  <td style={{ ...TD_R, fontWeight: 700 }}>{money(data?.totals.totalCommissionVat)}</td>
                  <td style={{ ...TD_R, fontWeight: 700 }}>{money(data?.totals.invoiceTotal)}</td>
                  <td style={TD} />
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        {excluded.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
              Not invoiced this month
            </h3>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: '0.82rem', color: '#4b5563' }}>
              {excluded.map((row) => (
                <li key={row.restaurantId} style={{ marginBottom: 4 }}>
                  <strong>{row.restaurantName}</strong>
                  {row.commissionRate ? ` (${row.commissionRate}%)` : ''} — {row.excludedDetail}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ── Recipients ──────────────────────────────────────────────── */}
      <div style={{ ...CARD, maxWidth: 720 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#051661', margin: 0 }}>
          Monthly send
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '4px 0 16px' }}>
          Where the previous month's invoices are emailed, and when. Saved immediately — no deploy
          needed.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <input
            type="checkbox"
            id="commissionInvoiceEmailEnabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <label
            htmlFor="commissionInvoiceEmailEnabled"
            style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}
          >
            Send automatically each month
          </label>
        </div>

        <label style={LABEL} htmlFor="commissionInvoiceRecipient">
          Send to
        </label>
        <input
          id="commissionInvoiceRecipient"
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="bookkeeper@example.com"
          style={{
            ...INPUT,
            width: '100%',
            marginBottom: 4,
            borderColor: recipient && !recipientValid ? '#dc2626' : '#d1d5db',
          }}
        />
        {recipient && !recipientValid ? (
          <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: '0 0 12px' }}>
            Not a valid email address.
          </p>
        ) : (
          <div style={{ height: 12 }} />
        )}

        <label style={LABEL} htmlFor="commissionInvoiceCc">
          CC (comma-separated, optional)
        </label>
        <input
          id="commissionInvoiceCc"
          type="text"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
          placeholder="accounts@example.com, finance@example.com"
          style={{ ...INPUT, width: '100%', marginBottom: 16 }}
        />

        <label style={LABEL} htmlFor="commissionInvoiceSendDay">
          Send on day of month
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            id="commissionInvoiceSendDay"
            type="number"
            min={1}
            max={28}
            value={Number.isFinite(sendDay) ? sendDay : ''}
            onChange={(e) => setSendDay(e.target.value === '' ? NaN : Number(e.target.value))}
            style={{ ...INPUT, width: 100 }}
          />
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            of the following month (1–28)
          </span>
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #f3f4f6',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="checkbox"
              id="commissionInvoiceRedirectEnabled"
              checked={redirectEnabled}
              onChange={(e) => setRedirectEnabled(e.target.checked)}
            />
            <label
              htmlFor="commissionInvoiceRedirectEnabled"
              style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}
            >
              Redirect for testing (don't email the bookkeeper yet)
            </label>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '6px 0 10px' }}>
            While this is on, every send — scheduled or manual — goes to the address below instead,
            with CC suppressed and a “test copy” banner on the email. “Send to” above stays saved,
            so going live is just unticking this.
          </p>
          <input
            type="email"
            value={redirectTo}
            onChange={(e) => setRedirectTo(e.target.value)}
            placeholder="tester@example.com"
            disabled={!redirectEnabled}
            style={{
              ...INPUT,
              width: '100%',
              background: redirectEnabled ? '#fff' : '#f3f4f6',
              color: redirectEnabled ? undefined : '#9ca3af',
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSaveRecipients}
          disabled={
            busy !== null || !recipientsDirty || (enabled && !recipientValid) ||
            !Number.isFinite(sendDay) || sendDay < 1 || sendDay > 28 ||
            (redirectEnabled && !redirectValid)
          }
          style={{
            marginTop: 20,
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: recipientsDirty ? '#7c3aed' : '#c7b3f0',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: recipientsDirty ? 'pointer' : 'not-allowed',
          }}
        >
          {busy === 'settings' ? 'Saving…' : 'Save recipients'}
        </button>
      </div>

      {/* ── History ─────────────────────────────────────────────────── */}
      <div style={CARD}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#051661', margin: '0 0 12px' }}>
          Sent history
        </h2>
        {dispatches.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Nothing sent yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={TH}>When</th>
                  <th style={TH}>Period</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Trigger</th>
                  <th style={TH}>To</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Invoices</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Commission</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => (
                  <tr key={d.id}>
                    <td style={TD}>{new Date(d.createdAt).toLocaleString('en-GB')}</td>
                    <td style={TD}>
                      {d.periodYear}-{String(d.periodMonth).padStart(2, '0')}
                    </td>
                    <td style={TD}>
                      <StatusPill status={d.status} />
                      {d.error ? (
                        <span style={{ color: '#991b1b', fontSize: '0.75rem', marginLeft: 8 }}>
                          {d.error}
                        </span>
                      ) : null}
                    </td>
                    <td style={TD}>{d.trigger}</td>
                    <td style={TD}>
                      {d.recipient ?? '—'}
                      {d.redirectedFrom ? (
                        <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                          test copy — {d.redirectedFrom} not contacted
                        </div>
                      ) : null}
                    </td>
                    <td style={TD_R}>{d.invoiceCount}</td>
                    <td style={TD_R}>£{Number(d.totalGrossCommission || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionInvoicesScreen;
