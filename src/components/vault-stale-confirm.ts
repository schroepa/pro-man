import { t } from "../i18n";

export type StaleWriteChoice = "reload" | "force";

type ConfirmFn = (paths: string[]) => Promise<StaleWriteChoice>;

let testOverride: ConfirmFn | null = null;

/** Test hook — replaces the modal with a deterministic choice. */
export function setStaleWriteConfirmForTests(fn: ConfirmFn | null): void {
  testOverride = fn;
}

/**
 * Ask whether to reload or force-save when the vault is stale.
 * Primary / Escape / backdrop → reload; secondary → force.
 */
export function askStaleWriteConfirm(paths: string[] = []): Promise<StaleWriteChoice> {
  if (testOverride) return testOverride(paths);
  if (typeof document === "undefined") return Promise.resolve("reload");

  return new Promise((resolve) => {
    const existing = document.getElementById("vault-stale-confirm");
    existing?.remove();

    const dialog = document.createElement("dialog");
    dialog.id = "vault-stale-confirm";
    dialog.className = "vault-stale-confirm";
    dialog.setAttribute("aria-labelledby", "vault-stale-confirm-title");

    const pathPreview = paths.slice(0, 3);
    const extra = paths.length - pathPreview.length;

    dialog.innerHTML = `
      <div class="vault-stale-confirm-panel">
        <h2 id="vault-stale-confirm-title" class="vault-stale-confirm-title">${escapeHtml(t().vault.staleConfirmTitle)}</h2>
        <p class="vault-stale-confirm-body">${escapeHtml(t().vault.staleConfirmBody)}</p>
        ${pathPreview.length ? `
          <ul class="vault-stale-confirm-paths">
            ${pathPreview.map(p => `<li><code>${escapeHtml(p)}</code></li>`).join("")}
            ${extra > 0 ? `<li class="vault-stale-confirm-more">${escapeHtml(t().vault.stalePathsMore.replace("{n}", String(extra)))}</li>` : ""}
          </ul>
        ` : ""}
        <div class="vault-stale-confirm-actions">
          <button type="button" class="btn btn-ghost-danger vault-stale-force-btn">${escapeHtml(t().vault.staleForceSave)}</button>
          <button type="button" class="btn btn-primary vault-stale-reload-btn" autofocus>${escapeHtml(t().vault.staleReload)}</button>
        </div>
      </div>
    `;

    const finish = (choice: StaleWriteChoice) => {
      dialog.removeEventListener("cancel", onCancel);
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(choice);
    };

    const onCancel = (e: Event) => {
      e.preventDefault();
      finish("reload");
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", (e) => {
      const rect = dialog.getBoundingClientRect();
      const inBox =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inBox) finish("reload");
    });

    dialog.querySelector(".vault-stale-reload-btn")?.addEventListener("click", () => finish("reload"));
    dialog.querySelector(".vault-stale-force-btn")?.addEventListener("click", () => finish("force"));

    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>(".vault-stale-reload-btn")?.focus();
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
