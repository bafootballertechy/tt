/**
 * workerPolyfill.ts
 * Polyfills global `window` in DedicatedWorkerGlobalScope or headless environments
 * to prevent ReferenceError in third-party libraries (e.g. mediabunny AudioContext detection).
 */
if (typeof globalThis !== 'undefined') {
  if (typeof (globalThis as any).window === 'undefined') {
    (globalThis as any).window = globalThis;
  }
}
