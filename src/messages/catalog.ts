import { CATALOG_DE } from "./catalog.de";
import type { MessageId } from "./message-ids";

export type Catalog = Record<MessageId, string>;

export const DEFAULT_LANGUAGE = "de";

const CATALOGS: Record<string, Catalog> = {
  [DEFAULT_LANGUAGE]: CATALOG_DE,
};

/** Returns the catalog for `language`, or the default language if it is not supported. */
export function getCatalog(language?: string): Catalog {
  const supportedLanguage = language && CATALOGS[language];

  return supportedLanguage || CATALOGS[DEFAULT_LANGUAGE];
}

export function isKnownMessageId(value: unknown): value is MessageId {
  return typeof value === "string" && value in CATALOG_DE;
}
