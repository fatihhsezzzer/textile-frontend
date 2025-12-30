/**
 * Formats a number as currency with Turkish locale
 * Shows decimal places only when the value has a fractional part
 * @param value - The numeric value to format
 * @param currency - The currency code (default: "TRY")
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currency: string = "TRY"
): string => {
  // Check if value has fractional part
  const hasFraction = value % 1 !== 0;

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formats a number with Turkish locale
 * Shows decimal places only when the value has a fractional part
 * @param value - The numeric value to format
 * @param maxDecimals - Maximum number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  maxDecimals: number = 2
): string => {
  // Check if value has fractional part
  const hasFraction = value % 1 !== 0;

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
};

/**
 * Normalizes Turkish characters for case-insensitive search
 * Converts both Turkish and English characters to lowercase equivalents
 * @param text - The text to normalize
 * @returns Normalized lowercase text
 */
export const normalizeTurkish = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
};

/**
 * Checks if text contains search term (case-insensitive, Turkish character aware)
 * @param text - The text to search in
 * @param searchTerm - The search term
 * @returns True if text contains search term
 */
export const turkishIncludes = (text: string, searchTerm: string): boolean => {
  return normalizeTurkish(text).includes(normalizeTurkish(searchTerm));
};
