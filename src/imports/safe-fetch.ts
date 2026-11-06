import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import zlib from "node:zlib";

/**
 * Loads a public web page for the link import without letting it reach the home network (SSRF):
 * only http(s), no local host names, and every resolved address (also after redirects) must be public.
 * The check runs inside the DNS lookup of the request, so a host cannot resolve to a public address for
 * the check and to a private one for the request. Rules: guidelines projects/rezepte.md, D8.
 */

export type FetchFailure = "invalid" | "blocked" | "unreachable" | "too-large";

export class FetchPageError extends Error {
  constructor(readonly failure: FetchFailure) {
    super(`Page could not be fetched: ${failure}`);
  }
}

export interface FetchLimits {
  maxBytes: number;
  timeoutMs: number;
  maxRedirects: number;
  /** Replaceable in tests, which run against a local server. */
  isAddressBlocked: (address: string) => boolean;
}

export const DEFAULT_LIMITS: FetchLimits = {
  maxBytes: 3 * 1024 * 1024,
  timeoutMs: 8000,
  maxRedirects: 3,
  isAddressBlocked: isPrivateAddress,
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const LOCAL_SUFFIXES = [
  ".localhost",
  ".local",
  ".home.arpa",
  ".lan",
  ".internal",
  ".fritz.box",
];
const USER_AGENT = "Mozilla/5.0 (compatible; RezepteImport/1.0)";

const PRIVATE_RANGES = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv6");
}

/** Loopback, private, link-local, carrier-grade NAT, multicast and reserved addresses. */
export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);

  if (mapped?.[1]) {
    return isPrivateAddress(mapped[1]);
  }

  const family = isIP(address);

  if (family === 0) {
    return true;
  }

  return PRIVATE_RANGES.check(address, family === 4 ? "ipv4" : "ipv6");
}

/** Names that only mean something at home: localhost, single labels ("fritzbox") and local suffixes. */
export function isLocalHostName(hostname: string): boolean {
  const name = hostname.toLowerCase().replace(/\.$/, "");

  if (isIP(name.replace(/^\[|\]$/g, ""))) {
    return false;
  }

  return (
    name === "localhost" ||
    !name.includes(".") ||
    LOCAL_SUFFIXES.some((suffix) => name.endsWith(suffix))
  );
}

/**
 * http(s) URL of a host that is not local, or a FetchPageError. IP addresses in the URL are checked here,
 * because Node connects to them without a DNS lookup.
 */
export function checkUrl(
  text: string,
  isAddressBlocked: (address: string) => boolean = isPrivateAddress,
): URL {
  let url: URL;

  try {
    url = new URL(text.trim());
  } catch {
    throw new FetchPageError("invalid");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchPageError("invalid");
  }

  const ipLiteral = url.hostname.replace(/^\[|\]$/g, "");
  const blockedIp = isIP(ipLiteral) !== 0 && isAddressBlocked(ipLiteral);

  if (
    url.username ||
    url.password ||
    isLocalHostName(url.hostname) ||
    blockedIp
  ) {
    throw new FetchPageError("blocked");
  }

  return url;
}

/** DNS lookup that fails when any resolved address is blocked. */
export function guardedLookup(
  isAddressBlocked: (address: string) => boolean,
): LookupFunction {
  return (hostname, options, callback) => {
    dnsLookup(
      hostname,
      { ...options, all: true },
      (error, addresses: LookupAddress[]) => {
        if (error) {
          callback(error, "", 0);
          return;
        }

        if (
          !addresses.length ||
          addresses.some((entry) => isAddressBlocked(entry.address))
        ) {
          callback(new FetchPageError("blocked"), "", 0);
          return;
        }

        if (options.all) {
          callback(null, addresses);
          return;
        }

        const [first] = addresses as [LookupAddress];
        callback(null, first.address, first.family);
      },
    );
  };
}

function decompress(response: IncomingMessage): NodeJS.ReadableStream {
  const encoding = String(
    response.headers["content-encoding"] ?? "",
  ).toLowerCase();

  if (encoding === "gzip") {
    return response.pipe(zlib.createGunzip());
  }

  if (encoding === "deflate") {
    return response.pipe(zlib.createInflate());
  }

  if (encoding === "br") {
    return response.pipe(zlib.createBrotliDecompress());
  }

  return response;
}

function charsetOf(response: IncomingMessage): BufferEncoding {
  const contentType = String(
    response.headers["content-type"] ?? "",
  ).toLowerCase();

  return /charset=(iso-8859-1|latin1|windows-1252)/.test(contentType)
    ? "latin1"
    : "utf8";
}

/** One request; resolves with the page text or the next URL of a redirect. */
function requestOnce(
  url: URL,
  limits: FetchLimits,
  deadline: number,
): Promise<{ text: string } | { redirect: URL }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      reject(new FetchPageError("unreachable"));
      return;
    }

    const request = client.get(
      url,
      {
        lookup: guardedLookup(limits.isAddressBlocked),
        timeout: remaining,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if (REDIRECT_STATUSES.has(status) && location) {
          response.resume();
          try {
            resolve({ redirect: new URL(location, url) });
          } catch {
            reject(new FetchPageError("unreachable"));
          }
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(new FetchPageError("unreachable"));
          return;
        }

        if (Number(response.headers["content-length"] ?? 0) > limits.maxBytes) {
          response.destroy();
          reject(new FetchPageError("too-large"));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        const body = decompress(response);

        body.on("data", (chunk: Buffer) => {
          size += chunk.length;

          if (size > limits.maxBytes) {
            response.destroy();
            reject(new FetchPageError("too-large"));
            return;
          }

          chunks.push(chunk);
        });
        body.on("end", () =>
          resolve({
            text: Buffer.concat(chunks).toString(charsetOf(response)),
          }),
        );
        body.on("error", () => reject(new FetchPageError("unreachable")));
      },
    );

    request.on("timeout", () =>
      request.destroy(new FetchPageError("unreachable")),
    );
    request.on("error", (error) =>
      reject(
        error instanceof FetchPageError
          ? error
          : new FetchPageError("unreachable"),
      ),
    );
  });
}

/** Loads a public page; follows a few redirects and checks every target again. */
export async function fetchPublicPage(
  address: string,
  limits: FetchLimits = DEFAULT_LIMITS,
): Promise<string> {
  const deadline = Date.now() + limits.timeoutMs;
  let url = checkUrl(address, limits.isAddressBlocked);

  for (let redirects = 0; redirects <= limits.maxRedirects; redirects += 1) {
    const result = await requestOnce(url, limits, deadline);

    if ("text" in result) {
      return result.text;
    }

    url = checkUrl(result.redirect.toString(), limits.isAddressBlocked);
  }

  throw new FetchPageError("unreachable");
}
