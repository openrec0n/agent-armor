// Thin wrapper around GoatCounter for type-safe, fail-silent event tracking.

interface GoatCounterAPI {
  count(vars: {
    path: string;
    title?: string;
    event?: boolean;
  }): void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounterAPI;
  }
}

/**
 * Track a custom event. Silently no-ops if GoatCounter is not loaded
 * (e.g. blocked by an adblocker).
 */
export function trackEvent(name: string, title?: string): void {
  try {
    window.goatcounter?.count({
      path: name,
      title,
      event: true,
    });
  } catch {
    // Analytics should never break the app
  }
}
