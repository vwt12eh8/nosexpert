/// <reference lib="webworker" />

const sw = self as any as ServiceWorkerGlobalScope;

sw.addEventListener("install", (event) => event.waitUntil((async () => {
    await sw.caches.open("main").then((cache) => cache.addAll([
        "./",
        "./icon.png",
        "./index.js",
        "./manifest.json",
    ]));
    await sw.skipWaiting();
})()));

sw.addEventListener("activate", (event) => event.waitUntil((async () => {
    await sw.clients.claim();
})()));

sw.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    if (event.request.url.startsWith("chrome-extension://")) return;
    if (event.request.url.match(/^https:\/\/[^\/]+\/\.well-known\/nostr\.json(#|\?|$)/)) return; // NIP-05

    const url = new URL(event.request.url);
    if (url.origin == sw.location.origin && url.pathname.endsWith("/index.html")) {
        event.respondWith(Response.redirect(url.pathname.slice(0, -10) + url.hash, 301));
        return;
    }

    event.respondWith(sw.caches.open("main").then(async (cache) => {
        const res = await sw.caches.match(event.request);
        if (res) {
            if (navigator.onLine) {
                return await Promise.race([
                    fetch(event.request).then((x) => {
                        if (x.ok) cache.put(new URL(event.request.url).pathname, x.clone());
                        return x;
                    }, () => res),
                    timeout(5000).then(() => res)
                ]);
            }
            return res;
        }
        return await fetch(event.request);
    }));
});

function getAbortError(signal: AbortSignal) {
    try {
        signal.throwIfAborted();
    } catch (ex) {
        return ex as Error;
    }
}

function timeout(ms: number, signal?: AbortSignal) {
    return new Promise((res, rej) => {
        if (signal?.aborted) return rej(getAbortError(signal));
        const t = setTimeout(res, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(t);
            rej(getAbortError(signal));
        });
    });
}
