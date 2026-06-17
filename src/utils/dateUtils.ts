/**
 * Formats a given date input string (e.g. ISO string or "YYYY-MM-DD")
 * into a clean "YYYY-MM-DD" calendar date in the Malaysia Time (Asia/Kuala_Lumpur) timezone
 * to avoid negative/positive offset timezone shifts.
 */
export function getMalaysiaDateString(dateInput: any): string {
  if (!dateInput) return "";
  const str = String(dateInput).trim();
  if (!str) return "";
  
  // If it's already a simple "YYYY-MM-DD", return it
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Parse using Date
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    return str;
  }
  
  try {
    // Format to YYYY-MM-DD in Malaysia Time (Kuala Lumpur)
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(d); // "yyyy-mm-dd"
  } catch (e) {
    // Fallback if formatting fails
    try {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (err) {
      return str;
    }
  }
}

/**
 * Validates whether the current clock time (in Malaysia timezone)
 * lies within the start and end boundary specified in the pass's TIME_RANGE string.
 */
export function isCurrentTimeInTimeRange(timeRange: string): { valid: boolean; reason?: string } {
  if (!timeRange || timeRange === "All Day" || timeRange.toLowerCase().includes("all day")) {
    return { valid: true };
  }
  
  // Parse format like "Morning Shift (07:00 - 13:00)" or "Noon Shift (13:01 - 19:00)"
  const regex = /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/;
  const match = timeRange.match(regex);
  if (!match) {
    return { valid: true };
  }
  
  const startHour = parseInt(match[1], 10);
  const startMin = parseInt(match[2], 10);
  const endHour = parseInt(match[3], 10);
  const endMin = parseInt(match[4], 10);
  
  const now = new Date();
  let hr = now.getHours();
  let min = now.getMinutes();
  
  try {
    const MYTimeStr = now.toLocaleTimeString("en-US", { timeZone: "Asia/Kuala_Lumpur", hour12: false });
    const parts = MYTimeStr.split(":");
    hr = parseInt(parts[0], 10);
    min = parseInt(parts[1], 10);
  } catch(e) {
    // Fallback to local system clock
  }
  
  const currentMinutes = hr * 60 + min;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    // Get pretty display time
    const displayHour = String(hr).padStart(2, "0");
    const displayMin = String(min).padStart(2, "0");
    return { 
      valid: false, 
      reason: `Current time (${displayHour}:${displayMin}) is outside restricted segment "${timeRange}"` 
    };
  }
  
  return { valid: true };
}

/**
 * Returns a formatting date-time string in Malaysia timezone (Asia/Kuala_Lumpur) "YYYY-MM-DD HH:mm:ss"
 * to write correct timestamps into the database.
 */
export function getMalaysiaDateTimeString(date?: Date): string {
  const d = date || new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    
    // safe format segment extraction
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === "year")?.value || String(d.getFullYear());
    const month = parts.find(p => p.type === "month")?.value || String(d.getMonth() + 1).padStart(2, "0");
    const day = parts.find(p => p.type === "day")?.value || String(d.getDate()).padStart(2, "0");
    const hour = parts.find(p => p.type === "hour")?.value || String(d.getHours()).padStart(2, "0");
    const minute = parts.find(p => p.type === "minute")?.value || String(d.getMinutes()).padStart(2, "0");
    const second = parts.find(p => p.type === "second")?.value || String(d.getSeconds()).padStart(2, "0");
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch (e) {
    // GMT+8 offset boundary fallback logic
    const gmt8Offset = 8 * 60 * 60 * 1000;
    const localTime = d.getTime();
    const utcTime = localTime + (d.getTimezoneOffset() * 60000);
    const myTime = new Date(utcTime + gmt8Offset);
    return myTime.toISOString().replace("T", " ").substring(0, 19);
  }
}

/**
 * Normalizes any timestamp inputs retrieved from database / Google sheet.
 * If raw ISO strings are saved (e.g. 2026-06-12T22:49:57.000Z), parses it in UTC context
 * and outputs the corresponding local Malaysia Time Zone (GMT+8) string "YYYY-MM-DD HH:mm:ss"
 * for beautiful local displaying.
 */
export function formatDisplayTimestamp(timestamp: any): string {
  if (!timestamp) return "";
  const str = String(timestamp).trim();
  if (!str) return "";

  // If already matches "YYYY-MM-DD HH:mm:ss" without timezone symbols, return as-is
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    return str;
  }

  // Parse if it has ISO symbols "Z" or "T"
  if (str.includes("Z") || str.includes("T")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return getMalaysiaDateTimeString(d);
    }
  }

  return str;
}

