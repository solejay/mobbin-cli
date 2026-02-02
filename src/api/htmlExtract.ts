import { bestImageUrlFromSrcSet } from './srcset.js';

function unescapeJsonString(s: string): string {
  // Handles common escaped sequences found inside Next.js data blobs.
  return s.replace(/\\u002F/g, '/').replace(/\\u003A/g, ':').replace(/\\u0026/g, '&');
}

function cleanUrl(u: string): string {
  // remove stray escape backslashes and trailing slashes/backslashes
  const v = unescapeJsonString(u).replace(/\\/g, '');
  return v.replace(/[\\/]+$/g, '');
}

function pickBest(urls: string[]): string | undefined {
  if (!urls.length) return undefined;

  // Drop known non-screen assets first.
  const filtered = urls.filter((u) => !u.includes('/image/static/') && !u.includes('/static/dictionary/'));

  // Prefer the actual screen CDN payloads
  const preferred = filtered.filter(
    (u) => u.includes('bytescale.mobbin.com') && u.includes('mobbin.com/prod/file.webp') && u.includes('enc='),
  );
  if (preferred.length) return preferred[0];

  const enc = filtered.filter((u) => u.includes('enc='));
  if (enc.length) return enc[0];

  return filtered[0] ?? urls[0];
}

export function bestBytescaleUrlFromHtml(html: string): string | undefined {
  // Many Next.js data blobs include URLs in an escaped form like: https:\/\/_...
  // Using RegExp constructor avoids the "/" delimiter escaping headaches.

  // srcset-like: "<url> 1920w <url> 3840w"
  const srcSetRe = new RegExp(
    'https:\\\\/\\\\/bytescale\\.mobbin\\.com[^"\\s]+\\s+1920w\\s+https:\\\\/\\\\/bytescale\\.mobbin\\.com[^"\\s]+\\s+3840w',
    'g',
  );

  const srcSetLike = html.match(srcSetRe);
  if (srcSetLike?.[0]) {
    const cleaned = cleanUrl(srcSetLike[0]);
    const url = bestImageUrlFromSrcSet(cleaned, undefined);
    if (url) return url;
  }

  // Collect escaped bytescale URLs
  const escapedUrlRe = new RegExp('https:\\\\/\\\\/bytescale\\.mobbin\\.com[^"\\s]+', 'g');
  const escaped = (html.match(escapedUrlRe) ?? []).map(cleanUrl);

  // Collect unescaped bytescale URLs
  const unescaped = (html.match(/https:\/\/bytescale\.mobbin\.com[^"\s]+/g) ?? []).map(cleanUrl);

  return pickBest([...escaped, ...unescaped]);
}
