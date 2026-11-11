/** Israeli plates have 7 digits (12-345-67) or 8 digits (123-45-678). Returns null when invalid. */
export function normalizePlate(input: string): string | null {
  const digits = input.replace(/[\s\-.]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 7) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  if (digits.length === 8) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  return null;
}
