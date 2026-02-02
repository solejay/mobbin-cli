export function bestImageUrlFromSrcSet(srcSet, fallback) {
    if (!srcSet)
        return fallback ?? undefined;
    // Typical format: "<url1> 1920w <url2> 3840w"
    const parts = srcSet.trim().split(/\s+/);
    const candidates = [];
    for (let i = 0; i < parts.length - 1; i += 2) {
        const url = parts[i];
        const widthToken = parts[i + 1];
        if (!url || !widthToken)
            continue;
        const m = widthToken.match(/^(\d+)w$/);
        if (!m)
            continue;
        const width = Number(m[1]);
        if (!Number.isFinite(width))
            continue;
        candidates.push({ url, width });
    }
    if (!candidates.length)
        return fallback ?? undefined;
    candidates.sort((a, b) => b.width - a.width);
    return candidates[0].url;
}
//# sourceMappingURL=srcset.js.map