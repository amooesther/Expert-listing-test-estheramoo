import "@testing-library/jest-dom/vitest";

// Mock scrollIntoView which is not implemented in JSDOM
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

