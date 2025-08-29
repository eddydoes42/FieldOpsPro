import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with proper formatting
 * @param amount - The amount to format
 * @param currency - The currency code (default: USD)
 * @param locale - The locale for formatting (default: en-US)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/**
 * Format a number with commas as thousands separators
 * @param amount - The number to format
 * @returns Formatted number string
 */
export function formatNumber(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US').format(numericAmount);
}

/**
 * Parse currency string back to number
 * @param currencyString - The currency string to parse
 * @returns Numeric value
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols, commas, and spaces
  const cleanString = currencyString.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format budget with appropriate display based on amount
 * @param amount - The budget amount
 * @param budgetType - The type of budget (fixed, hourly, etc.)
 * @returns Formatted budget display string
 */
export function formatBudget(amount: number | string, budgetType?: string): string {
  const formattedAmount = formatCurrency(amount);
  
  if (!budgetType) {
    return formattedAmount;
  }

  switch (budgetType) {
    case 'hourly':
      return `${formattedAmount}/hr`;
    case 'per_device':
      return `${formattedAmount}/device`;
    case 'materials_labor':
      return `${formattedAmount} (materials + labor)`;
    case 'fixed':
    default:
      return formattedAmount;
  }
}