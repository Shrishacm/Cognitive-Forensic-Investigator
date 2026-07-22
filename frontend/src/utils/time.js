/**
 * UTC timestamp helpers
 *
 * The backend uses datetime.utcnow() which produces naive UTC timestamps
 * with no timezone suffix (e.g. "2026-07-22T01:12:34").
 * JavaScript's Date constructor treats a string without a timezone as
 * LOCAL time, so on IST (UTC+5:30) it appears 5h30m in the past.
 *
 * fromUtc() fixes this by appending 'Z' when no timezone info is present,
 * telling JavaScript the value is UTC.
 */

/**
 * Parse a UTC timestamp string from the backend into a JS Date.
 * Accepts strings, Date objects, or null/undefined.
 */
export function fromUtc(value) {
  if (!value) return new Date()
  if (value instanceof Date) return value
  const s = String(value).trim()
  // Already has explicit timezone info — parse as-is
  if (
    s.endsWith('Z') ||
    s.includes('+') ||
    /[+-]\d{2}:\d{2}$/.test(s)
  ) {
    return new Date(s)
  }
  // Naive UTC string from backend — append Z
  return new Date(s + 'Z')
}
