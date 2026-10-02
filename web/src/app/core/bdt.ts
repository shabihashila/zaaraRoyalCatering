/** BDT money formatting (display only; domain money stays `decimal` server-side).
 * en-IN-style grouping is common in BD (৳1,20,000); locale is configurable. */
export function formatBDT(value: number, locale = 'en-IN'): string {
  const grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value));
  return `৳${grouped}`;
}

export function formatBDTExact(value: number, locale = 'en-IN'): string {
  const grouped = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `৳${grouped}`;
}
