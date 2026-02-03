const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];

export type FetchRetryOptions = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  retryStatus?: number[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, base: number, max: number) {
  const exp = Math.min(max, base * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 100);
  return exp + jitter;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const asDate = Date.parse(value);
  if (!Number.isNaN(asDate)) {
    const delay = asDate - Date.now();
    return delay > 0 ? delay : 0;
  }
  return undefined;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: FetchRetryOptions = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const retries = opts.retries ?? 2;
  const retryDelayMs = opts.retryDelayMs ?? 500;
  const maxRetryDelayMs = opts.maxRetryDelayMs ?? 4_000;
  const retryStatuses = new Set(opts.retryStatus ?? DEFAULT_RETRY_STATUSES);

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) return res;

      const shouldRetry = retryStatuses.has(res.status);
      if (!shouldRetry || attempt === retries) return res;

      const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
      const delay = retryAfter ?? backoffDelay(attempt, retryDelayMs, maxRetryDelayMs);
      await res.body?.cancel().catch(() => undefined);
      await sleep(delay);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt === retries) throw err;
      const delay = backoffDelay(attempt, retryDelayMs, maxRetryDelayMs);
      await sleep(delay);
    }
  }

  throw lastErr ?? new Error('fetch failed');
}
