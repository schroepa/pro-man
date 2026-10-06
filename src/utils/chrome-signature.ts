import { store } from "../storage/store";
import { getLanguage } from "../i18n";

/** Signature of chrome that must remount when these change (not task body data). */
export function getChromeSignature(): string {
  return [
    store.currentView,
    store.selectedClientId ?? "",
    store.selectedProjectId ?? "",
    store.filterPriority,
    store.filterStatus,
    store.filterQuick,
    store.filterAssignee,
    store.filterCycle,
    store.searchQuery,
    store.selectedDocId ?? "",
    store.vault.connectionState,
    store.vault.vaultName,
    getLanguage(),
    document.documentElement.getAttribute("data-theme") ?? "",
    store.favoriteProjectIds.join(","),
    store.getClients().map(c => c.id).join(","),
    store.getProjects().map(p => `${p.id}:${p.clientId}`).join(","),
  ].join("|");
}
