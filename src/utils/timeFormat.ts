/**
 * Time formatting utilities
 * Provides consistent time and date formatting across the application
 */

/**
 * Format seconds to MM:SS format (no milliseconds)
 * @param seconds - Total seconds to format
 * @returns Formatted time string (e.g., "3:45", "10:02")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Format ISO date string to localized date/time
 * @param iso - ISO date string (optional)
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(iso?: string): string {
  try {
    return iso ? new Date(iso).toLocaleString() : "";
  } catch {
    return "";
  }
}

/**
 * Time-related constants
 */
export const TIME_CONSTANTS = {
  SECONDS_PER_MINUTE: 60,
  MILLISECONDS_PER_SECOND: 1000,
  TOKEN_REFRESH_THRESHOLD_SECONDS: 30,
} as const;
