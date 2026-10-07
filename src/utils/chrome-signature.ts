import { store } from "../storage/store";
import { getLanguage } from "../i18n";
import { isOnboarded } from "../components/onboarding-banner";

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
    String(store.vaultStale),
    store.getActiveMemberId() ?? "",
    store.getMembers().map(m => m.id).join(","),
    getLanguage(),
    document.documentElement.getAttribute("data-theme") ?? "",
    store.favoriteProjectIds.join(","),
    store.getClients().map(c => c.id).join(","),
    store.getProjects().map(p => `${p.id}:${p.clientId}`).join(","),
    String(store.getAllRawTasks().length === 0),
    String(store.hasSampleData()),
    String(isOnboarded()),
  ].join("|");
}
