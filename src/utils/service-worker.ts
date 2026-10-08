const RELOAD_FLAG = "proman_sw_reload";
const RECOVERY_FLAG = "proman_sw_recovery";

declare global {
  interface Window {
    __PROMAN_BOOTED__?: boolean;
  }
}

/** Mark successful app paint so the inline HTML watchdog does not wipe caches. */
export function markAppBooted(): void {
  window.__PROMAN_BOOTED__ = true;
  try {
    sessionStorage.removeItem(RECOVERY_FLAG);
  } catch {
    /* ignore */
  }
}

async function clearShellCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}

async function unregisterWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
}

/**
 * Nuclear recovery for stuck iOS Safari shells: unregister SW, wipe Cache Storage, reload once.
 */
export async function recoverBrokenShell(): Promise<void> {
  try {
    if (sessionStorage.getItem(RECOVERY_FLAG) === "1") return;
    sessionStorage.setItem(RECOVERY_FLAG, "1");
  } catch {
    /* private mode — still try cleanup */
  }

  try {
    await clearShellCaches();
    await unregisterWorkers();
  } catch {
    /* ignore */
  }

  location.reload();
}

/**
 * Register SW with iOS-safe update path:
 * - updateViaCache: 'none' so Safari does not HTTP-cache sw.js itself
 * - activate waiting workers immediately
 * - reload once when a new controller takes over
 */
export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      try {
        if (sessionStorage.getItem(RELOAD_FLAG) === "1") return;
        sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        /* ignore */
      }
      location.reload();
    });

    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/app/",
      updateViaCache: "none",
    });

    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* ignore */
    }

    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    await reg.update().catch(() => undefined);
  } catch {
    // PWA optional — ignore registration failures in preview / file://
  }
}
