import { Head, Html, Main, NextScript } from "next/document";

const officeHistoryGuard = `
(() => {
  if (!window.history) return;

  const fallbackStateChange = function fallbackStateChange() {};

  for (const method of ["pushState", "replaceState"]) {
    let current = typeof window.history[method] === "function"
      ? window.history[method].bind(window.history)
      : fallbackStateChange;

    try {
      Object.defineProperty(window.history, method, {
        configurable: true,
        get() {
          return typeof current === "function" ? current : fallbackStateChange;
        },
        set(nextValue) {
          if (typeof nextValue === "function") {
            current = nextValue.bind(window.history);
          }
        },
      });
    } catch {
      if (typeof window.history[method] !== "function") {
        try {
          window.history[method] = fallbackStateChange;
        } catch {}
      }
    }
  }
})();
`;

export default function Document() {
  return (
    <Html>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: officeHistoryGuard }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
