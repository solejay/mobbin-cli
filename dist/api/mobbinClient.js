import { FetchScreenInfoResponseSchema, FetchScreensResponseSchema } from './mobbinSchemas.js';
import { bestImageUrlFromSrcSet } from './srcset.js';
import { bestBytescaleUrlFromHtml } from './htmlExtract.js';
import { isHighConfidenceImageUrl, pickBestImageUrl } from './imageUrls.js';
import { fetchWithRetry } from '../utils/http.js';
function normalizePlatform(p) {
    const v = (p ?? '').toLowerCase();
    if (v === 'ios')
        return 'ios';
    if (v === 'android')
        return 'android';
    if (v === 'web')
        return 'web';
    return 'unknown';
}
export class MobbinClient {
    baseUrl;
    cookieHeader;
    userAgent;
    constructor(opts = {}) {
        this.baseUrl = opts.baseUrl ?? 'https://mobbin.com';
        this.cookieHeader = opts.cookieHeader;
        this.userAgent = opts.userAgent ?? 'mobbin-cli/0.2.0';
    }
    apiUrl(path) {
        return `${this.baseUrl}${path}`;
    }
    async httpJson(url, init) {
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
        return (await res.json());
    }
    async whoami() {
        // Light auth check: this endpoint appears to require a valid session.
        try {
            await this.httpJson(this.apiUrl('/api/recent-searches'), { method: 'GET' });
            return { ok: true };
        }
        catch (e) {
            return { ok: false, message: e?.message ?? String(e) };
        }
    }
    async search(query, opts) {
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
    async getFlow(id) {
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
    async listFlowAssets(flow) {
        const screenId = flow.screens[0]?.id;
        if (!screenId)
            return [];
        // 1) Try internal API first.
        let apiBestUrl;
        try {
            const raw = await this.httpJson(this.apiUrl('/api/screen/fetch-screen-info'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ screenId }),
            });
            const parsed = FetchScreenInfoResponseSchema.parse(raw);
            apiBestUrl = pickBestImageUrl([
                parsed.value.fullpageScreenCdnImgSources?.downloadableSrc,
                parsed.value.screenCdnImgSources?.downloadableSrc,
                bestImageUrlFromSrcSet(parsed.value.fullpageScreenCdnImgSources?.srcSet, undefined),
                bestImageUrlFromSrcSet(parsed.value.screenCdnImgSources?.srcSet, undefined),
                parsed.value.appFullpageScreen?.fullpageScreenUrl ?? undefined,
                parsed.value.screenUrl ?? undefined,
            ]);
        }
        catch {
            // ignore
        }
        // If API already returned a strong bytescale URL, skip HTML scraping for faster downloads.
        if (isHighConfidenceImageUrl(apiBestUrl)) {
            return [
                {
                    screenId,
                    index: 1,
                    title: flow.screens[0]?.title,
                    imageUrl: apiBestUrl,
                },
            ];
        }
        // 2) Otherwise, try bytescale URL from screen HTML and combine both candidates.
        let htmlBestUrl;
        try {
            const pageRes = await fetchWithRetry(`${this.baseUrl}/screens/${screenId}`, {
                headers: {
                    ...(this.cookieHeader ? { cookie: this.cookieHeader } : {}),
                    'user-agent': this.userAgent,
                    accept: 'text/html,*/*',
                },
            }, { timeoutMs: 15_000, retries: 0 });
            if (pageRes.ok) {
                const html = await pageRes.text();
                htmlBestUrl = bestBytescaleUrlFromHtml(html);
            }
        }
        catch {
            // ignore
        }
        const bestUrl = pickBestImageUrl([htmlBestUrl, apiBestUrl]);
        if (!bestUrl)
            return [];
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
//# sourceMappingURL=mobbinClient.js.map