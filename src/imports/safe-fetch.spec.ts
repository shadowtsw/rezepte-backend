import http from "node:http";
import type { AddressInfo } from "node:net";
import zlib from "node:zlib";

import {
  checkUrl,
  DEFAULT_LIMITS,
  fetchPublicPage,
  FetchPageError,
  guardedLookup,
  isLocalHostName,
  isPrivateAddress,
  type FetchLimits,
} from "./safe-fetch";

describe("isPrivateAddress", () => {
  it("blocks home network, loopback and reserved ranges", () => {
    for (const address of [
      "192.168.178.1",
      "10.0.0.5",
      "172.20.1.1",
      "127.0.0.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:192.168.178.131",
      "not an ip",
    ]) {
      expect([address, isPrivateAddress(address)]).toEqual([address, true]);
    }
  });

  it("allows public addresses", () => {
    for (const address of ["93.184.216.34", "2606:4700::6810:84e5"]) {
      expect([address, isPrivateAddress(address)]).toEqual([address, false]);
    }
  });
});

describe("isLocalHostName and checkUrl", () => {
  it("recognizes local names", () => {
    expect(
      [
        "localhost",
        "fritzbox",
        "rezepte.home.arpa",
        "nas.local",
        "fritz.box",
      ].map(isLocalHostName),
    ).toEqual([true, true, true, true, false]);
    expect(isLocalHostName("www.chefkoch.de")).toBe(false);
  });

  it("accepts public http(s) links", () => {
    expect(
      checkUrl(" https://www.chefkoch.de/rezepte/1/x.html ").hostname,
    ).toBe("www.chefkoch.de");
  });

  it("rejects other protocols, local hosts, IP literals at home and credentials", () => {
    const failureOf = (url: string) => {
      try {
        checkUrl(url);
        return "ok";
      } catch (error) {
        return (error as FetchPageError).failure;
      }
    };

    expect(failureOf("ftp://example.org/")).toBe("invalid");
    expect(failureOf("kein link")).toBe("invalid");
    expect(failureOf("http://192.168.178.1/")).toBe("blocked");
    expect(failureOf("http://3232235777/")).toBe("blocked"); // 192.168.1.1 as one number
    expect(failureOf("http://[::1]:3000/")).toBe("blocked");
    expect(failureOf("https://rezepte.home.arpa/")).toBe("blocked");
    expect(failureOf("https://user:pw@example.org/")).toBe("blocked");
  });
});

describe("fetchPublicPage against a local server", () => {
  let server: http.Server;
  let base: string;
  /** Tests allow 127.0.0.1, everything else stays blocked. */
  const limits: FetchLimits = {
    ...DEFAULT_LIMITS,
    maxBytes: 1000,
    timeoutMs: 2000,
    isAddressBlocked: (address) =>
      address !== "127.0.0.1" && isPrivateAddress(address),
  };

  beforeAll(async () => {
    server = http.createServer((request, response) => {
      const routes: Record<string, () => void> = {
        "/page": () => response.end("<html>Rezept</html>"),
        "/gzip": () => {
          response.setHeader("Content-Encoding", "gzip");
          response.end(zlib.gzipSync("<html>gepackt</html>"));
        },
        "/big": () => response.end("x".repeat(5000)),
        "/to-page": () => {
          response.writeHead(302, { Location: "/page" });
          response.end();
        },
        "/to-home": () => {
          response.writeHead(302, { Location: "http://192.168.178.1/" });
          response.end();
        },
        "/loop": () => {
          response.writeHead(302, { Location: "/loop" });
          response.end();
        },
        "/missing": () => {
          response.writeHead(404);
          response.end();
        },
      };

      (routes[request.url ?? ""] ?? routes["/missing"])();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  const failureOf = (promise: Promise<string>) =>
    promise.then(
      () => "ok",
      (error: FetchPageError) => error.failure,
    );

  it("blocks the local server with the default rules", async () => {
    expect(await failureOf(fetchPublicPage(`${base}/page`))).toBe("blocked");
  });

  it("loads pages, also packed and behind a redirect", async () => {
    expect(await fetchPublicPage(`${base}/page`, limits)).toBe(
      "<html>Rezept</html>",
    );
    expect(await fetchPublicPage(`${base}/gzip`, limits)).toBe(
      "<html>gepackt</html>",
    );
    expect(await fetchPublicPage(`${base}/to-page`, limits)).toBe(
      "<html>Rezept</html>",
    );
  });

  it("stops at redirects into the home network, loops, errors and big pages", async () => {
    expect(await failureOf(fetchPublicPage(`${base}/to-home`, limits))).toBe(
      "blocked",
    );
    expect(await failureOf(fetchPublicPage(`${base}/loop`, limits))).toBe(
      "unreachable",
    );
    expect(await failureOf(fetchPublicPage(`${base}/missing`, limits))).toBe(
      "unreachable",
    );
    expect(await failureOf(fetchPublicPage(`${base}/big`, limits))).toBe(
      "too-large",
    );
  });
});

describe("guardedLookup", () => {
  it("fails when a name resolves to a blocked address", async () => {
    const lookup = guardedLookup(isPrivateAddress);
    const error = await new Promise<unknown>((resolve) =>
      lookup("localhost", {}, (lookupError) => resolve(lookupError)),
    );

    expect(error).toBeInstanceOf(FetchPageError);
  });

  it("passes allowed addresses on", async () => {
    const lookup = guardedLookup(() => false);
    const address = await new Promise<string>((resolve) =>
      lookup("localhost", {}, (_error, resolved) =>
        resolve(resolved as string),
      ),
    );

    expect(["127.0.0.1", "::1"]).toContain(address);
  });
});
