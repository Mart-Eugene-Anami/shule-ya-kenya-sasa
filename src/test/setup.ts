/**
 * Global test setup file for Vitest.
 * Configures jest-dom matchers and browser API polyfills
 * needed by components that reference window/matchMedia.
 */
import "@testing-library/jest-dom";

// Polyfill matchMedia for components that use responsive hooks
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
