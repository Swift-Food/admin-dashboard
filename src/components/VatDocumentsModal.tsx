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

export function VatDocumentsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const presets = buildPresets();
  const [from, setFrom] = useState(presets[2].from); // default: this quarter
  const [to, setTo] = useState(presets[2].to);
  const [wantReceipts, setWantReceipts] = useState(true);
  const [wantSupplierInvoices, setWantSupplierInvoices] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTypes: VatDocumentType[] = [
    ...(wantReceipts ? (["receipts"] as const) : []),
    ...(wantSupplierInvoices ? (["supplier-invoices"] as const) : []),
  ];
  const rangeValid = from !== "" && to !== "" && from <= to;
  const canDownload = selectedTypes.length > 0 && rangeValid && !isDownloading;

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      const blob = await cateringService.downloadVatDocumentsZip(from, to, selectedTypes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vat-documents_${from}_to_${to}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e: any) {
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
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-full p-6">
        <h2 className="text-xl font-bold text-gray-900">Download VAT documents</h2>
        <p className="text-sm text-gray-500 mt-1">
          Batch-export a ZIP for all paid &amp; completed orders, by event date.
        </p>

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
                    setFrom(p.from);
                    setTo(p.to);
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
                min={VAT_START}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                style={{ color: "#000" }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={to}
                min={VAT_START}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                style={{ color: "#000" }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            VAT registration began 1 Apr 2026 — earlier dates are excluded automatically.
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p> : null}

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

export default VatDocumentsModal;
