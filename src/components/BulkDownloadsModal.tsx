import { useState } from "react";
import { Modal } from "./Modal";
import cateringService, { type VatDocumentType } from "../services/catering.service";

// VAT registration effective date — the backend excludes earlier orders.
const VAT_START = "2026-04-01";

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Preset = { label: string; from: string; to: string };

const buildPresets = (): Preset[] => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3) * 3;
  return [
    { label: "This month", from: fmtDate(new Date(y, m, 1)), to: fmtDate(now) },
    { label: "Last month", from: fmtDate(new Date(y, m - 1, 1)), to: fmtDate(new Date(y, m, 0)) },
    { label: "This quarter", from: fmtDate(new Date(y, q, 1)), to: fmtDate(now) },
    { label: "Last quarter", from: fmtDate(new Date(y, q - 3, 1)), to: fmtDate(new Date(y, q, 0)) },
  ];
};

const currentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Parse whatever the backend/axios hands back on failure (blob-wrapped JSON,
// plain JSON, or nothing usable) into a single human-readable message.
async function extractErrorMessage(e: any): Promise<string> {
  let message = "Download failed — please try again.";
  const data = e?.response?.data;
  if (data instanceof Blob) {
    try {
      message = JSON.parse(await data.text()).message || message;
    } catch {
      /* non-JSON error body — keep the default message */
    }
  } else if (data?.message) {
    message = data.message;
  }
  return Array.isArray(message) ? message.join(", ") : message;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type DocKind = "vat" | "commission" | "payout" | "checklists";

const TABS: Array<{ key: DocKind; label: string }> = [
  { key: "vat", label: "VAT Documents" },
  { key: "commission", label: "Commission Invoices" },
  { key: "payout", label: "Payout Receipts" },
  { key: "checklists", label: "Checklists" },
];

// Shared "event date range" picker used by every tab whose backend endpoint
// takes ?from=&to=. Each tab keeps its own from/to state (they're
// conceptually different ranges — e.g. VAT range vs. checklist range — even
// though the control looks the same).
function DateRangePicker({
  from,
  to,
  onFrom,
  onTo,
  minDate,
  helperText,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  minDate?: string;
  helperText?: string;
}) {
  const presets = buildPresets();
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Event date range</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((p) => {
          const active = from === p.from && to === p.to;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                onFrom(p.from);
                onTo(p.to);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-all ${
                active
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:border-purple-300"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            min={minDate}
            onChange={(e) => onFrom(e.target.value)}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            style={{ color: "#000" }}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            min={minDate}
            onChange={(e) => onTo(e.target.value)}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            style={{ color: "#000" }}
          />
        </div>
      </div>
      {helperText ? <p className="text-xs text-gray-400 mt-2">{helperText}</p> : null}
    </div>
  );
}

export function BulkDownloadsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<DocKind>("vat");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // VAT documents
  const vatPresets = buildPresets();
  const [vatFrom, setVatFrom] = useState(vatPresets[2].from);
  const [vatTo, setVatTo] = useState(vatPresets[2].to);
  const [wantReceipts, setWantReceipts] = useState(true);
  const [wantSupplierInvoices, setWantSupplierInvoices] = useState(false);

  // Commission invoices
  const [invoiceMonth, setInvoiceMonth] = useState(currentYearMonth());

  // Payout receipts
  const payoutPresets = buildPresets();
  const [payoutFrom, setPayoutFrom] = useState(payoutPresets[2].from);
  const [payoutTo, setPayoutTo] = useState(payoutPresets[2].to);

  // Checklists
  const checklistPresets = buildPresets();
  const [checklistFrom, setChecklistFrom] = useState(checklistPresets[0].from);
  const [checklistTo, setChecklistTo] = useState(checklistPresets[0].to);

  const selectedVatTypes: VatDocumentType[] = [
    ...(wantReceipts ? (["receipts"] as const) : []),
    ...(wantSupplierInvoices ? (["supplier-invoices"] as const) : []),
  ];

  const switchTab = (next: DocKind) => {
    setTab(next);
    setError(null);
  };

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      if (tab === "vat") {
        const blob = await cateringService.downloadVatDocumentsZip(vatFrom, vatTo, selectedVatTypes);
        triggerBlobDownload(blob, `vat-documents_${vatFrom}_to_${vatTo}.zip`);
      } else if (tab === "commission") {
        const [yearStr, monthStr] = invoiceMonth.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        const blob = await cateringService.downloadCommissionInvoicesZip(year, month);
        triggerBlobDownload(blob, `commission-invoices_${invoiceMonth}.zip`);
      } else if (tab === "payout") {
        const blob = await cateringService.downloadPayoutReceiptsZip(payoutFrom, payoutTo);
        triggerBlobDownload(blob, `payout-receipts_${payoutFrom}_to_${payoutTo}.zip`);
      } else {
        const blob = await cateringService.downloadChecklistsZip(checklistFrom, checklistTo);
        triggerBlobDownload(blob, `checklists_${checklistFrom}_to_${checklistTo}.zip`);
      }
      onClose();
    } catch (e: any) {
      setError(await extractErrorMessage(e));
    } finally {
      setIsDownloading(false);
    }
  };

  const vatRangeValid = vatFrom !== "" && vatTo !== "" && vatFrom <= vatTo;
  const payoutRangeValid = payoutFrom !== "" && payoutTo !== "" && payoutFrom <= payoutTo;
  const checklistRangeValid = checklistFrom !== "" && checklistTo !== "" && checklistFrom <= checklistTo;
  const commissionValid = /^\d{4}-\d{2}$/.test(invoiceMonth);

  const canDownload =
    !isDownloading &&
    (tab === "vat"
      ? selectedVatTypes.length > 0 && vatRangeValid
      : tab === "commission"
        ? commissionValid
        : tab === "payout"
          ? payoutRangeValid
          : checklistRangeValid);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-full p-6">
        <h2 className="text-xl font-bold text-gray-900">Bulk Downloads</h2>
        <p className="text-sm text-gray-500 mt-1">Batch-export documents as a ZIP.</p>

        <div className="mt-4 flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-lg">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={`flex-1 min-w-[110px] px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                tab === t.key ? "bg-white shadow text-purple-700" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "vat" && (
          <>
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Documents</p>
              <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
                <input
                  type="checkbox"
                  checked={wantReceipts}
                  onChange={(e) => setWantReceipts(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-purple-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">Customer receipts</span>
                  <span className="block text-xs text-gray-500">One VAT receipt (RCT) per order</span>
                </span>
              </label>
              <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 transition-colors mt-2">
                <input
                  type="checkbox"
                  checked={wantSupplierInvoices}
                  onChange={(e) => setWantSupplierInvoices(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-purple-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">Supplier invoices</span>
                  <span className="block text-xs text-gray-500">
                    Restaurant-side (SUP), one per restaurant per order
                  </span>
                </span>
              </label>
            </div>
            <DateRangePicker
              from={vatFrom}
              to={vatTo}
              onFrom={setVatFrom}
              onTo={setVatTo}
              minDate={VAT_START}
              helperText="VAT registration began 1 Apr 2026 — earlier dates are excluded automatically."
            />
          </>
        )}

        {tab === "commission" && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Monthly commission tax invoices
            </p>
            <p className="text-xs text-gray-500 mb-3">
              One .html invoice per restaurant with a completed order this month — same document each
              restaurant sees on their own dashboard. Open a file and use your browser's Print → Save as
              PDF if you need a PDF copy.
            </p>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <input
              type="month"
              value={invoiceMonth}
              max={currentYearMonth()}
              onChange={(e) => setInvoiceMonth(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              style={{ color: "#000" }}
            />
          </div>
        )}

        {tab === "payout" && (
          <>
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Payout receipts</p>
              <p className="text-xs text-gray-500">
                One PDF per restaurant per order — same receipt restaurants receive by email when paid out.
              </p>
            </div>
            <DateRangePicker from={payoutFrom} to={payoutTo} onFrom={setPayoutFrom} onTo={setPayoutTo} />
          </>
        )}

        {tab === "checklists" && (
          <>
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Order checklists</p>
              <p className="text-xs text-gray-500">
                One PDF per (restaurant, session) whose delivery date falls in range — every pickup job for
                the period in one ZIP.
              </p>
            </div>
            <DateRangePicker
              from={checklistFrom}
              to={checklistTo}
              onFrom={setChecklistFrom}
              onTo={setChecklistTo}
            />
          </>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!canDownload}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm"
          >
            {isDownloading ? "Preparing ZIP…" : "Download ZIP"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default BulkDownloadsModal;
