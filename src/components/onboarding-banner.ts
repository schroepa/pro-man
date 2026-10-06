import { store } from "../storage/store";
import { t } from "../i18n";

export const ONBOARD_KEY = "proman_onboarded";

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * First-run banner: connect vault (primary) or start without vault (secondary).
 */
export function renderOnboardingBanner(onDismiss: () => void): HTMLElement | null {
  if (isOnboarded()) return null;

  const i18n = t();
  const banner = document.createElement("div");
  banner.className = "onboarding-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", i18n.onboarding.title);
  banner.innerHTML = `
    <div class="onboarding-banner-body">
      <strong class="onboarding-banner-title">${i18n.onboarding.title}</strong>
      <p class="onboarding-banner-tip">${i18n.onboarding.tip}</p>
    </div>
    <div class="onboarding-banner-actions">
      <button type="button" id="onboard-connect" class="btn btn-primary">${i18n.actions.connectVault}</button>
      <button type="button" id="onboard-dismiss" class="btn btn-secondary">${i18n.onboarding.dismiss}</button>
    </div>
  `;

  banner.querySelector("#onboard-connect")?.addEventListener("click", async () => {
    try {
      const connected = await store.vault.connect();
      if (connected) {
        const { showToast } = await import("./toast");
        showToast(i18n.vault.connectedToast, "success");
        const result = await store.reloadAll();
        if (!result.ok && result.reason === "permission_denied") {
          showToast(i18n.vault.permissionDeniedToast, "warning");
        } else if (result.ok && result.warning) {
          showToast(result.warning, "warning");
        }
      } else if (store.vault.consumeUserAbort()) {
        const { showToast } = await import("./toast");
        showToast(i18n.vault.connectAbortedToast, "info");
      }
    } catch (err: unknown) {
      const { showToast } = await import("./toast");
      const message = err instanceof Error ? err.message : "Fehler beim Verbinden.";
      showToast(message, "error");
    }
    markOnboarded();
    onDismiss();
  });

  banner.querySelector("#onboard-dismiss")?.addEventListener("click", () => {
    markOnboarded();
    onDismiss();
  });

  return banner;
}
