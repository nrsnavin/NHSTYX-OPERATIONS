import { api } from './axios';

/** Fetches a CSV report (with auth) and triggers a browser download. */
async function downloadCsv(path: string, params: Record<string, string | undefined> = {}) {
  const res = await api.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const cd = res.headers['content-disposition'] as string | undefined;
  const name = cd?.match(/filename="?([^"]+)"?/)?.[1] ?? 'report.csv';
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const downloadSalesReport = (from?: string, to?: string) =>
  downloadCsv('/reports/sales', { from, to });

export const downloadGstReport = (from?: string, to?: string) =>
  downloadCsv('/reports/gst', { from, to });

export const downloadInventoryReport = () => downloadCsv('/reports/inventory');
