/** Pure quote math for the public package detail page (client-side estimate;
 * server-authoritative pricing lands with Phase 4 ordering). No costs here. */

export interface QuoteAddOn {
  id: string;
  name: string;
  pricingType: 'Flat' | 'PerHead';
  price: number;
  selected: boolean;
  qty: number;
}

export interface QuoteBreakdown {
  guests: number;
  perHeadRate: number;
  baseTotal: number;
  addOnTotal: number;
  grandTotal: number;
}

export function perHeadRate(salePricePerHead: number, variantDeltaPerHead: number): number {
  return salePricePerHead + variantDeltaPerHead;
}

export function addOnLineTotal(
  pricingType: 'Flat' | 'PerHead',
  price: number,
  qty: number,
  guests: number,
): number {
  if (qty <= 0 || price < 0) return 0;
  return pricingType === 'Flat' ? price * qty : price * qty * guests;
}

export function quoteTotal(
  guests: number,
  salePricePerHead: number,
  variantDeltaPerHead: number,
  addOns: Pick<QuoteAddOn, 'pricingType' | 'price' | 'qty' | 'selected'>[],
): QuoteBreakdown {
  const rate = perHeadRate(salePricePerHead, variantDeltaPerHead);
  const baseTotal = rate * guests;
  const addOnTotal = addOns
    .filter((a) => a.selected)
    .reduce((sum, a) => sum + addOnLineTotal(a.pricingType, a.price, a.qty, guests), 0);
  return { guests, perHeadRate: rate, baseTotal, addOnTotal, grandTotal: baseTotal + addOnTotal };
}

export function validateGuests(guests: number, minGuests: number, maxGuests: number | null): string | null {
  if (!Number.isInteger(guests) || guests < 1) return 'Guests must be at least 1.';
  if (guests < minGuests) return `This package needs at least ${minGuests} guests.`;
  if (maxGuests !== null && guests > maxGuests) return `This package serves at most ${maxGuests} guests.`;
  return null;
}
