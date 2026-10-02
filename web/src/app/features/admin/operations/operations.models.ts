import { HttpErrorResponse } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/api.config';
export const ADMIN_API = `${API_BASE_URL}/api/v1/admin`;
export const PUBLIC_API = `${API_BASE_URL}/api/v1/public`;
export interface OrderRow {
  id: string;
  orderNo: string;
  customerId: string | null;
  contactName: string;
  contactPhone: string;
  packageId: string;
  packageName: string;
  categoryName: string;
  variantName: string | null;
  guests: number;
  eventDate: string;
  eventTime: string;
  eventType: string;
  venueAddress: string;
  specialInstructions: string | null;
  status: string;
  unitPricePerHead: number;
  subTotal: number;
  addOnTotal: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  rowVersion: string;
}
export interface OrderDetail {
  order: OrderRow;
  allowedTransitions: string[];
  snapshot: {
    items: string[];
    variant: string | null;
    addOns: { id: string; name: string; pricingType: string; price: number }[];
  };
  payments: {
    id: string;
    method: string;
    amount: number;
    reference: string | null;
    paidAt: string;
  }[];
  history: {
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedAt: string;
  }[];
}
export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  rowVersion: string;
}
export interface KitchenRow {
  eventDate: string;
  itemName: string;
  variantName: string;
  totalHeads: number;
  orderCount: number;
}
export const STATUSES = [
  'Pending',
  'Confirmed',
  'InPreparation',
  'Dispatched',
  'Delivered',
  'Completed',
  'Cancelled',
  'Rejected',
];
export function problem(err: HttpErrorResponse): string {
  if (err.status === 409) return 'This record changed or already exists. Refresh and try again.';
  const body = err.error as { detail?: string; errors?: Record<string, string[]> } | null;
  return (
    body?.detail ??
    (body?.errors
      ? Object.values(body.errors).flat().join(' ')
      : 'Unable to complete the request. Please try again.')
  );
}
export function dateInDhaka(offset = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

export function revealEditor(): void {
  setTimeout(() => {
    const panel = document.querySelector<HTMLElement>('.ops-editor');
    panel?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    panel
      ?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input,select,textarea',
      )
      ?.focus({ preventScroll: true });
  }, 0);
}
