// Core market-data types & date helpers shared across API routes and providers.

export type ISODateString = `${number}-${number}-${number}`;

export type MarketProvider = 'stooq' | 'fred';

export type MarketPoint = { date: ISODateString; close: number };

/** Parse YYYY-MM-DD (UTC) into a Date at 00:00:00Z. */
export function parseISODateString(s: string | null | undefined): Date | null {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toISODateString(d: Date): ISODateString {
  return d.toISOString().slice(0, 10) as ISODateString;
}

export function addDaysUTC(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Safe constructor for provider-specific Date from ISO date string. */
export function isoDateToUTCDate(s: ISODateString): Date {
  // new Date('YYYY-MM-DDT00:00:00Z') is unambiguous and stable.
  return new Date(`${s}T00:00:00Z`);
}
