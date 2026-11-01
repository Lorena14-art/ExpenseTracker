import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const offlineApp = {
  name: "expense-tracker-offline-app",
  apply: "build",
  generateBundle(_options, bundle) {
    const appFiles = Object.keys(bundle).filter(
      (fileName) =>
        fileName === "index.html" ||
        fileName.endsWith(".js") ||
        fileName.endsWith(".css"),
    );
    const precache = [
      "/",
      "/index.html",
      "/manifest.webmanifest",
      "/expense-tracker-logo.png",
      "/expense-tracker-favicon.png?v=2",
      "/expense-tracker-icon-192.png?v=2",
      ...appFiles.map((fileName) => `/${fileName}`),
    ];
    const version = appFiles.map((fileName) => fileName.replace(/[^\w-]/g, "_")).join("_");
    const serviceWorker = `
const CACHE_NAME = "expense-tracker-${version}";
const PRECACHE_URLS = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("expense-tracker-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put("/index.html", response.clone());
            await cache.put("/", response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/index.html")) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })
  );
});
`;
    this.emitFile({ type: "asset", fileName: "sw.js", source: serviceWorker });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineApp],
});
