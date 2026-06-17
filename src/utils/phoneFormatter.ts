/**
 * Utility functions for phone number standardizing and formatting
 */

export function formatPhoneNumber(phone: any, defaultCountryCode: string = "+60"): string {
  if (phone === null || phone === undefined) return "";
  
  const phoneStr = String(phone).trim();
  if (!phoneStr) return "";
  
  // Keep only digits and plus symbol initially
  let cleaned = phoneStr.replace(/[^\d+]/g, "").trim();
  
  if (!cleaned) return "";

  // Limit the string to maximum 12 digits (excluding the initial + if present)
  if (cleaned.startsWith("+")) {
    cleaned = "+" + cleaned.slice(1).replace(/\D/g, "").slice(0, 12);
  } else {
    cleaned = cleaned.replace(/\D/g, "").slice(0, 12);
  }

  // Standardize defaultCountryCode to ensure it starts with "+"
  const normCountry = defaultCountryCode.startsWith("+") ? defaultCountryCode : "+" + defaultCountryCode;
  const rawCountryCode = normCountry.replace("+", ""); // e.g. "60"

  // Handle number if it isn't formulated with +
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith(rawCountryCode)) {
      cleaned = "+" + cleaned;
    } else {
      if (cleaned.startsWith("0")) {
        // e.g. converts 0123456789 to +60123456789 (removes leading local zero and appends country code)
        cleaned = normCountry + cleaned.slice(1);
      } else {
        // Prepend normCountry
        cleaned = normCountry + cleaned;
      }
    }
  }

  // Re-apply max 12 digits limit after prepending default country code if it exceeded
  if (cleaned.startsWith("+")) {
    cleaned = "+" + cleaned.slice(1).replace(/\D/g, "").slice(0, 12);
  } else {
    cleaned = cleaned.replace(/\D/g, "").slice(0, 12);
  }

  // Visual Groupings for polished UI output:
  // 1. Malaysia (+60) formatting
  if (cleaned.startsWith("+60")) {
    const rawDigits = cleaned.slice(3); // The rest of local number
    if (rawDigits.startsWith("11")) {
      // +60 11-xxxx xxxx
      if (rawDigits.length >= 10) {
        return `+60 11-${rawDigits.slice(2, 6)} ${rawDigits.slice(6)}`;
      } else if (rawDigits.length > 2) {
        return `+60 11-${rawDigits.slice(2)}`;
      }
    } else {
      // +60 1X-XXX XXXX (or smaller)
      if (rawDigits.length >= 9) {
        return `+60 ${rawDigits.slice(0, 2)}-${rawDigits.slice(2, 5)} ${rawDigits.slice(5)}`;
      } else if (rawDigits.length >= 7) {
        return `+60 ${rawDigits.slice(0, 2)}-${rawDigits.slice(2, 5)} ${rawDigits.slice(5)}`;
      } else if (rawDigits.length > 2) {
        return `+60 ${rawDigits.slice(0, 2)}-${rawDigits.slice(2)}`;
      }
    }
    return cleaned;
  }
  
  // 2. USA / Canada (+1) formatting
  if (cleaned.startsWith("+1")) {
    const rawDigits = cleaned.slice(2);
    if (rawDigits.length >= 10) {
      return `+1 (${rawDigits.slice(0, 3)}) ${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
    } else if (rawDigits.length >= 7) {
      return `+1 (${rawDigits.slice(0, 3)}) ${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
    } else if (rawDigits.length >= 3) {
      return `+1 (${rawDigits.slice(0, 3)}) ${rawDigits.slice(3)}`;
    }
    return cleaned;
  }

  // 3. Singapore (+65) formatting
  if (cleaned.startsWith("+65")) {
    const rawDigits = cleaned.slice(3);
    if (rawDigits.length >= 8) {
      return `+65 ${rawDigits.slice(0, 4)} ${rawDigits.slice(4)}`;
    } else if (rawDigits.length > 0) {
      return `+65 ${rawDigits}`;
    }
    return cleaned;
  }

  // 4. Fallback generalized formatter for custom arbitrary country prefixes:
  if (cleaned.startsWith(normCountry)) {
    const rawDigits = cleaned.slice(normCountry.length);
    if (rawDigits.length >= 7) {
      return `${normCountry} ${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
    } else if (rawDigits.length >= 3) {
      return `${normCountry} ${rawDigits.slice(0, 3)}-${rawDigits.slice(3)}`;
    }
  }

  return cleaned;
}
