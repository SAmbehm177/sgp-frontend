/** Formats a date as YYYY-MM-DD using the local calendar (not UTC). */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Returns whether a YYYY-MM-DD value is earlier than today's local date. */
export const isBeforeLocalToday = (value: string, today: Date = new Date()): boolean =>
  Boolean(value) && value < getLocalDateString(today);
