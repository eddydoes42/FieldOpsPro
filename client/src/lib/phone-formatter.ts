/**
 * Phone number formatting utilities
 */

/**
 * Formats a phone number string to (XXX) XXX-XXXX format
 * @param value - Raw phone number input
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Don't format if less than 4 digits
  if (digits.length < 4) {
    return digits;
  }
  
  // Handle different lengths
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else {
    // For numbers longer than 10 digits, format first 10 and add the rest
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}${digits.slice(10) ? ' ext. ' + digits.slice(10) : ''}`;
  }
}

/**
 * Extracts raw digits from a formatted phone number
 * @param formattedNumber - Formatted phone number string
 * @returns Raw digits only
 */
export function extractPhoneDigits(formattedNumber: string): string {
  return formattedNumber.replace(/\D/g, '');
}

/**
 * Validates if a phone number has the minimum required digits
 * @param phoneNumber - Phone number to validate
 * @returns Boolean indicating if phone number is valid
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const digits = extractPhoneDigits(phoneNumber);
  return digits.length >= 10 && digits.length <= 15; // Support international numbers
}

/**
 * Custom hook for phone number input handling
 * @param initialValue - Initial phone number value
 * @param onChange - Callback function when value changes
 * @returns Object with formatted value and change handler
 */
export function usePhoneInput(initialValue: string = '', onChange?: (value: string) => void) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatPhoneNumber(rawValue);
    
    // Update the input value
    e.target.value = formatted;
    
    // Call the onChange callback with the formatted value
    if (onChange) {
      onChange(formatted);
    }
  };

  return {
    value: formatPhoneNumber(initialValue),
    onChange: handlePhoneChange
  };
}