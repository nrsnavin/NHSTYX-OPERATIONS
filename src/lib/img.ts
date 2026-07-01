import { env } from '../config/env';

let _origin = '';
try {
  // env.apiUrl is e.g. http://localhost:4000/api/v1 → origin http://localhost:4000.
  // Falls back to the page origin when apiUrl is relative (proxied deploys).
  _origin = new URL(env.apiUrl, window.location.origin).origin;
} catch {
  _origin = '';
}

/**
 * Resolves a stored image path for display in the console. Relative
 * `/uploads/...` paths (what the API now returns) are joined to the API origin;
 * absolute URLs — legacy localhost ones or CDN photos — are returned unchanged.
 */
export function imageSrc(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${_origin}${url}` : url;
}
