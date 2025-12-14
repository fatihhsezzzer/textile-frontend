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
