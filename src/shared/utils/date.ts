/**
 * Format a date string into a human-readable format.
 */
export function formatDate(dateString: string): string {
  return parseDate(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function parseDate(dateString: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!dateOnlyMatch) return new Date(dateString);

  const year = Number(dateOnlyMatch[1]);
  const month = Number(dateOnlyMatch[2]);
  const day = Number(dateOnlyMatch[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(NaN);
  }

  return date;
}

export function isValidDateOnly(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString) &&
    !Number.isNaN(parseDate(dateString).getTime());
}

export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get a default due date (14 days from today).
 */
export function getDefaultDueDate(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 14);
  return toDateOnlyString(date);
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
export function getTodayDate(): string {
  return toDateOnlyString(new Date());
}

/**
 * Check if a date is overdue (past today).
 */
export function isOverdue(dueDateString: string): boolean {
  const dueDate = parseDate(dueDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}
