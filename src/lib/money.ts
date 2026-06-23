const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

/** Formats integer paise as an Indian Rupee string (25000 → "₹250.00"). */
export const formatPaise = (paise: number): string => inr.format((paise ?? 0) / 100);
