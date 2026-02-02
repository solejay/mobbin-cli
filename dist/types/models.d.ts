export type Platform = 'ios' | 'android' | 'web' | 'unknown';
export type SearchResult = {
    id: string;
    title: string;
    appName: string;
    platform: Platform;
    url: string;
    thumbUrl?: string;
    tags?: string[];
};
export type Flow = {
    id: string;
    appName: string;
    flowName: string;
    platform: Platform;
    sourceUrl: string;
    screens: Screen[];
};
export type Screen = {
    id: string;
    index: number;
    title?: string;
};
export type ScreenAsset = {
    screenId: string;
    index: number;
    title?: string;
    imageUrl: string;
    contentType?: string;
};
//# sourceMappingURL=models.d.ts.map