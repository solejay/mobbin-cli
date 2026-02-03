import type { Flow, Platform, ScreenAsset, SearchResult } from '../types/models.js';
import { FetchScreenInfoResponseSchema, FetchScreensResponseSchema } from './mobbinSchemas.js';
import { bestImageUrlFromSrcSet } from './srcset.js';
import { bestBytescaleUrlFromHtml } from './htmlExtract.js';
import { fetchWithRetry } from '../utils/http.js';

export type MobbinClientOptions = {
  baseUrl?: string;
  cookieHeader?: string; // e.g. "a=b; c=d"
  userAgent?: string;
};

function normalizePlatform(p?: string | null): Platform {
  const v = (p ?? '').toLowerCase();
  if (v === 'ios') return 'ios';
  if (v === 'android') return 'android';
  if (v === 'web') return 'web';
  return 'unknown';
}

export class MobbinClient {
  private baseUrl: string;
  private cookieHeader?: string;
  private userAgent: string;

  constructor(opts: MobbinClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? 'https://mobbin.com';
    this.cookieHeader = opts.cookieHeader;
    this.userAgent = opts.userAgent ?? 'mobbin-cli/0.2.0';
  }

  private apiUrl(path: string) {
    return `${this.baseUrl}${path}`;
  }

  private async httpJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetchWithRetry(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(this.cookieHeader ? { cookie: this.cookieHeader } : {}),
        'user-agent': this.userAgent,
        accept: 'application/json, text/plain, */*',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}\n${text.slice(0, 800)}`);
    }

    return (await res.json()) as T;
  }

  async whoami(): Promise<{ ok: boolean; message?: string }> {
    // Light auth check: this endpoint appears to require a valid session.
    try {
      await this.httpJson(this.apiUrl('/api/recent-searches'), { method: 'GET' });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? String(e) };
    }
  }

  async search(query: string, opts?: { platform?: Platform; limit?: number }): Promise<SearchResult[]> {
    const platform = opts?.platform ?? 'ios';
    const pageSize = opts?.limit ?? 24;

    // Discovered via sniff: POST /api/content/fetch-screens
    const payload = {
      searchRequestId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      filterOptions: {
        filterOperator: 'or',
        platform,
        screenElements: null,
        // Best effort: Mobbin seems to accept null or a list.
        screenKeywords: query ? [query] : null,
        screenPatterns: null,
        appCategories: null,
        hasAnimation: null,
      },
      paginationOptions: {
        pageSize,
        sortBy: 'trending',
      },
    };

    const raw = await this.httpJson(this.apiUrl('/api/content/fetch-screens'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const parsed = FetchScreensResponseSchema.parse(raw);

    return parsed.value.data.map((item) => {
      const titleParts = [...(item.screenPatterns ?? []), ...(item.screenElements ?? [])].filter(Boolean);
      const title = titleParts.slice(0, 3).join(' · ') || 'Screen';

      return {
        id: item.id,
        title,
        appName: item.appName ?? 'Unknown App',
        platform: normalizePlatform(item.platform),
        url: `${this.baseUrl}/screens/${item.id}`,
        thumbUrl: item.screenCdnImgSources?.src ?? item.screenUrl ?? undefined,
        tags: item.screenPatterns ?? undefined,
      };
    });
  }

  async getFlow(id: string): Promise<Flow> {
    // For now: treat id as a screenId and build a one-screen "flow".
    const raw = await this.httpJson(this.apiUrl('/api/screen/fetch-screen-info'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ screenId: id }),
    });

    const parsed = FetchScreenInfoResponseSchema.parse(raw);
    const appName = parsed.value.appVersion?.app?.appName ?? 'Unknown App';
    const platform = normalizePlatform(parsed.value.appVersion?.app?.platform);

    return {
      id,
      appName,
      flowName: `Screen ${parsed.value.screenNumber ?? id}`,
      platform,
      sourceUrl: `${this.baseUrl}/screens/${id}`,
      screens: [{ id, index: 1, title: `Screen ${parsed.value.screenNumber ?? ''}`.trim() }],
    };
  }

  async listFlowAssets(flow: Flow): Promise<ScreenAsset[]> {
    const screenId = flow.screens[0]?.id;
    if (!screenId) return [];

    // 1) Try internal API (may return supabase URLs which sometimes 404).
    let fallbackUrl: string | undefined;
    try {
      const raw = await this.httpJson(this.apiUrl('/api/screen/fetch-screen-info'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ screenId }),
      });

      const parsed = FetchScreenInfoResponseSchema.parse(raw);

      fallbackUrl =
        bestImageUrlFromSrcSet(
          parsed.value.fullpageScreenCdnImgSources?.srcSet ?? parsed.value.screenCdnImgSources?.srcSet,
          parsed.value.appFullpageScreen?.fullpageScreenUrl ?? parsed.value.screenUrl ?? undefined,
        ) ?? parsed.value.screenUrl ?? undefined;
    } catch {
      // ignore
    }

    // 2) Prefer bytescale CDN URL scraped from the screen page.
    // Mobbin’s supabase public bucket URLs can return "Bucket not found" for some assets,
    // while the bytescale URLs tend to work.
    let bestUrl: string | undefined;
    try {
      const pageRes = await fetchWithRetry(`${this.baseUrl}/screens/${screenId}`, {
        headers: {
          ...(this.cookieHeader ? { cookie: this.cookieHeader } : {}),
          'user-agent': this.userAgent,
          accept: 'text/html,*/*',
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        bestUrl = bestBytescaleUrlFromHtml(html) ?? fallbackUrl;
      } else {
        bestUrl = fallbackUrl;
      }
    } catch {
      bestUrl = fallbackUrl;
    }

    if (!bestUrl) return [];

    return [
      {
        screenId,
        index: 1,
        title: flow.screens[0]?.title,
        imageUrl: bestUrl,
      },
    ];
  }
}
