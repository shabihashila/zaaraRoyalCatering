import { describe, expect, it } from 'vitest';
import { addOnLineTotal, perHeadRate, quoteTotal, validateGuests } from './quote-calc';

describe('quote-calc (public estimate, no costs)', () => {
  it('adds variant delta per head', () => {
    expect(perHeadRate(500, 0)).toBe(500);
    expect(perHeadRate(500, 80)).toBe(580);
  });

  it('books Royal Kacchi Mutton for 60 guests = 34,800', () => {
    const q = quoteTotal(60, 500, 80, []);
    expect(q.perHeadRate).toBe(580);
    expect(q.baseTotal).toBe(34800);
    expect(q.grandTotal).toBe(34800);
  });

  it('adds flat and per-head add-ons', () => {
    const q = quoteTotal(50, 380, 0, [
      { pricingType: 'Flat', price: 5000, qty: 1, selected: true },
      { pricingType: 'PerHead', price: 20, qty: 1, selected: true },
      { pricingType: 'Flat', price: 999, qty: 1, selected: false },
    ]);
    expect(q.baseTotal).toBe(19000);
    expect(q.addOnTotal).toBe(5000 + 20 * 50);
    expect(q.grandTotal).toBe(19000 + 6000);
  });

  it('enforces MinGuests and MaxGuests', () => {
    expect(validateGuests(39, 40, null)).toContain('40');
    expect(validateGuests(40, 40, null)).toBeNull();
    expect(validateGuests(0, 1, null)).not.toBeNull();
    expect(validateGuests(501, 1, 500)).toContain('500');
  });

  it('ignores zero-qty add-on lines', () => {
    expect(addOnLineTotal('Flat', 1000, 0, 60)).toBe(0);
  });
});
