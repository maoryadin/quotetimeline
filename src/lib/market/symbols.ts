export const ALLOWED_SYMBOLS = new Set(['spy.us', '^spx', '^vix', 'vxx.us']);

export type MarketProvider = 'stooq' | 'fred';

export function providerForSymbol(symbol: string): { provider: MarketProvider; id: string } {
  // Our UI uses a small set of conventional symbols.
  // Map them to provider-specific identifiers.
  if (symbol === '^spx') return { provider: 'fred', id: 'SP500' };
  if (symbol === '^vix') return { provider: 'fred', id: 'VIXCLS' };

  // Fallback to Stooq symbol passthrough for ETFs.
  return { provider: 'stooq', id: symbol };
}
