import { store } from "../storage/store";
import { t } from "../i18n";
import { showToast } from "./toast";
import { TablerIcon } from "./icons";

/** Soft Concurrent banner when vault files changed on disk. */
export function renderVaultStaleBanner(): HTMLElement | null {
  if (!store.vault.isConnected || !store.staleBannerVisible) return null;

  const paths = store.vaultStalePaths;
  const preview = paths.slice(0, 3);
  const extra = paths.length - preview.length;

  const banner = document.createElement("div");
  banner.className = "vault-stale-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = `
    <div class="vault-stale-banner-text">
      <strong>${escapeHtml(t().vault.staleBanner)}</strong>
      <span>${escapeHtml(t().vault.staleBannerHint)}</span>
      ${preview.length ? `
        <ul class="vault-stale-banner-paths">
          ${preview.map(p => `<li><code>${escapeHtml(p)}</code></li>`).join("")}
          ${extra > 0 ? `<li>${escapeHtml(t().vault.stalePathsMore.replace("{n}", String(extra)))}</li>` : ""}
        </ul>
      ` : ""}
    </div>
    <div class="vault-stale-banner-actions">
      <button type="button" class="btn btn-ghost vault-stale-dismiss-btn">
        ${escapeHtml(t().vault.staleDismiss)}
      </button>
      <button type="button" class="btn btn-primary vault-stale-reload-btn">
        ${TablerIcon.refresh({ size: 14 })}
        <span>${escapeHtml(t().vault.staleReload)}</span>
      </button>
    </div>
  `;

  banner.querySelector(".vault-stale-dismiss-btn")?.addEventListener("click", () => {
    store.dismissStaleBannerUntilNextCheck();
  });

  banner.querySelector(".vault-stale-reload-btn")?.addEventListener("click", async () => {
    const result = await store.reloadAll();
    if (result.ok) {
      showToast(result.warning || t().vault.reloadedToast, result.warning ? "warning" : "success");
    } else if (result.reason === "permission_denied") {
      showToast(t().vault.permissionDeniedToast, "warning");
    } else {
      showToast(result.message || t().vault.reloadFailedToast, "error");
    }
  });

  return banner;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
