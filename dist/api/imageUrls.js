function scoreImageUrl(url) {
    const lower = url.toLowerCase();
    let score = 0;
    if (lower.includes('bytescale.mobbin.com'))
        score += 100;
    if (lower.includes('/mobbin.com/prod/file.webp'))
        score += 40;
    if (lower.includes('enc='))
        score += 20;
    if (/\.(png|webp|jpe?g)(\?|$)/.test(lower))
        score += 10;
    // Supabase URLs are often less reliable for direct download in this project.
    if (lower.includes('supabase'))
        score -= 25;
    return score;
}
export function pickBestImageUrl(candidates) {
    const deduped = [...new Set(candidates.filter((c) => Boolean(c)))];
    if (!deduped.length)
        return undefined;
    deduped.sort((a, b) => scoreImageUrl(b) - scoreImageUrl(a));
    return deduped[0];
}
export function isHighConfidenceImageUrl(url) {
    if (!url)
        return false;
    const lower = url.toLowerCase();
    return (lower.includes('bytescale.mobbin.com') &&
        (lower.includes('enc=') || lower.includes('/mobbin.com/prod/file.webp')));
}
//# sourceMappingURL=imageUrls.js.map