// Tracking parameters to strip during normalization
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_cid',
  'ref', 'fbclid', 'gclid', 'gclsrc', 'dclid',
  'msclkid', 'twclid', 'li_fat_id',
  '_ga', '_gl', '_hsenc', '_hsmi',
  'mc_cid', 'mc_eid',
  'oly_anon_id', 'oly_enc_id',
  'vero_id', 'rb_clickid',
  'wickedid', 'yclid',
  'spm', 'share_token',
]);

// URL schemes that indicate internal/non-content pages
const EXCLUDED_SCHEMES = new Set([
  'about:', 'moz-extension:', 'chrome:', 'chrome-extension:',
  'data:', 'blob:', 'javascript:', 'file:',
]);

/**
 * Normalize a URL by stripping tracking parameters.
 * Returns null if the URL is invalid.
 */
export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    // Remove tracking params
    const keysToDelete = [];
    for (const key of url.searchParams.keys()) {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.has(lower) || lower.startsWith('utm_')) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      url.searchParams.delete(key);
    }

    // Remove trailing hash if empty
    if (url.hash === '#') url.hash = '';

    // Sort remaining params for consistent canonicalization
    url.searchParams.sort();

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Check if a URL should be excluded (internal pages, localhost, etc.)
 */
export function isExcludedUrl(rawUrl) {
  if (!rawUrl) return true;

  // Check excluded schemes
  for (const scheme of EXCLUDED_SCHEMES) {
    if (rawUrl.startsWith(scheme)) return true;
  }

  try {
    const url = new URL(rawUrl);

    // Exclude localhost
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') {
      return true;
    }

    // Exclude non-http(s) schemes
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Check if a URL matches a glob-like exclusion pattern.
 * Supports * as wildcard.
 */
export function matchesPattern(url, pattern) {
  if (!pattern) return false;
  // Convert glob pattern to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  try {
    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(url);
  } catch {
    return false;
  }
}
