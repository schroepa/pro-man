export type ToastType = "info" | "success" | "error" | "warning";

let toastContainer: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (toastContainer && document.body.contains(toastContainer)) {
    return toastContainer;
  }
  toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-live", "polite");
  toastContainer.setAttribute("aria-relevant", "additions");
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(message: string, type: ToastType = "info", durationMs = 4000): void {
  const container = ensureContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;

  const dismiss = () => {
    toast.classList.add("toast-leaving");
    window.setTimeout(() => toast.remove(), 200);
  };

  toast.addEventListener("click", dismiss);
  container.appendChild(toast);

  window.setTimeout(dismiss, durationMs);
}
