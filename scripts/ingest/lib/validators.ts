export function assertValidHttpUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`Invalid URL protocol: ${url}`);
  }
}

export function toISODate(dateLike: string, label = 'date') {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}: ${dateLike}`);
  return d.toISOString().slice(0, 10);
}
