/** Formats rupee amounts the Indian way: ₹1.25 Cr, ₹45.00 L, ₹9,500. */
export const formatPrice = (value: string | number | null | undefined): string => {
  const amount = typeof value === "number" ? value : parseFloat(value ?? "");
  if (!Number.isFinite(amount)) return "Price on request";
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

/** "under_construction" -> "Under construction" */
export const humanize = (value: string | null | undefined): string => {
  if (!value) return "";
  const text = value.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
