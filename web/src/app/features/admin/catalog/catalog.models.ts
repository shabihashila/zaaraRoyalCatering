import { API_BASE_URL } from '../../../core/api.config';

export interface AdminPackageItem {
  itemId: string;
  itemName: string;
  displayName: string | null;
  costPerHead: number;
  sortOrder: number;
}

export interface AdminPackage {
  id: string;
  categoryName: string;
  name: string;
  slug: string;
  salePricePerHead: number;
  totalCost: number;
  profit: number;
  marginPct: number;
  minGuests: number;
  maxGuests: number | null;
  tagline: string | null;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  rowVersion: string;
  items: AdminPackageItem[];
}

export interface CostingRow {
  packageId: string;
  packageName: string;
  categoryName: string;
  salePricePerHead: number;
  totalCost: number;
  profit: number;
  marginPct: number;
}

export interface PriceEntry {
  id: number;
  oldPrice: number;
  newPrice: number;
  changedAt: string;
  changedBy: string | null;
}

export const CATALOG_API = `${API_BASE_URL}/api/v1/admin/catalog`;

/** Packages with margin below this are highlighted (default 35%). */
export const MARGIN_THRESHOLD = 0.35;

export function marginOf(sale: number, cost: number): number {
  return sale <= 0 ? 0 : (sale - cost) / sale;
}

export function toCsv(rows: CostingRow[]): string {
  const head = 'Category,Package,Sale (BDT/head),Total Cost,Profit,Margin %';
  const lines = rows.map((r) =>
    [
      r.categoryName,
      r.packageName,
      r.salePricePerHead,
      r.totalCost,
      r.profit,
      (r.marginPct * 100).toFixed(1),
    ].join(','),
  );
  return head + '\n' + lines.join('\n') + '\n';
}

export function downloadCsv(filename: string, csv: string, doc: Document): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
