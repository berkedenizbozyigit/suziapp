const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Render a price like "₺1,299" or "1299 SEK", tolerating null values. */
export function formatPrice(price: number | null, currency: string | null): string {
  if (price == null) return '—';
  const amount = price.toLocaleString('en-US');
  const code = currency ?? '';
  const symbol = CURRENCY_SYMBOLS[code];
  if (symbol) return `${symbol}${amount}`;
  return code ? `${amount} ${code}` : amount;
}
