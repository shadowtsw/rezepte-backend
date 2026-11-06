/** Loads a public page as text; replaced by a fake in tests. */
export const PAGE_FETCHER = Symbol("PAGE_FETCHER");

export type PageFetcher = (url: string) => Promise<string>;
