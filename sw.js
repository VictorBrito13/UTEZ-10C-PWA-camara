'use strict';

const CACHE_NAME = 'inspeccion-visual-v1';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves
          .filter((clave) => clave !== CACHE_NAME)
          .map((clave) => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const peticion = event.request;

  if (peticion.method !== 'GET') {
    return;
  }

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(peticion)
      .then((respuestaCache) => {
        if (respuestaCache) {
          return respuestaCache;
        }

        return fetch(peticion)
          .then((respuestaRed) => {
            if (respuestaRed && respuestaRed.status === 200 && respuestaRed.type === 'basic') {
              const copia = respuestaRed.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(peticion, copia))
                .catch(() => {});
            }
            return respuestaRed;
          })
          .catch(() => {
            if (peticion.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Recurso no disponible sin conexión.', {
              status: 503,
              statusText: 'Sin conexión',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});
