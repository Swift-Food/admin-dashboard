import http from "./http";
import { BASE_URL } from "../constants";
import type {
  OrderFinancialsOverviewParams,
  OrderFinancialsOverviewResponse,
} from "../types/order-financials.types";

const getOverview = async (
  params: OrderFinancialsOverviewParams
): Promise<OrderFinancialsOverviewResponse> => {
  const res = await http.get<OrderFinancialsOverviewResponse>(
    "admin/orders/financials",
    { params }
  );
  return res.data;
};

/**
 * Open the printable HTML invoice in a new tab. The page exposes a "Save as PDF"
 * button that triggers window.print().
 */
const openInvoiceHTML = (
  restaurantId: string,
  year: number,
  month: number
): void => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.alert("Not authenticated.");
    return;
  }

  // Open a placeholder window synchronously to avoid popup-blocker, then
  // fetch the HTML with the auth header and write it into the window.
  const win = window.open("about:blank", "_blank");
  if (!win) return;

  const url = `${BASE_URL}/admin/orders/financials/restaurants/${encodeURIComponent(
    restaurantId
  )}/invoice/${year}/${month}/html`;

  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (res) => {
      if (!res.ok) {
        const msg = `Invoice request failed: ${res.status} ${res.statusText}`;
        win.document.write(`<pre>${msg}</pre>`);
        return;
      }
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    })
    .catch((err) => {
      win.document.write(`<pre>${String(err)}</pre>`);
    });
};

const downloadCSV = async (
  kind: "summary" | "detail",
  params: OrderFinancialsOverviewParams
): Promise<void> => {
  const res = await http.get<Blob>(`admin/orders/financials/export/${kind}.csv`, {
    params,
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `regular-orders-${kind}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default { getOverview, openInvoiceHTML, downloadCSV };
