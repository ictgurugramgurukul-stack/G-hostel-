export interface ModalOptions {
  title: string;
  bodyHtml: string;
  footerHtml?: string;
  onMount?: (root: HTMLElement) => void;
}

export function openModal(opts: ModalOptions): { close: () => void; root: HTMLElement } {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2 class="font-display">${opts.title}</h2>
      <div class="modal-body">${opts.bodyHtml}</div>
      ${opts.footerHtml ? `<div class="modal-footer">${opts.footerHtml}</div>` : ""}
    </div>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  const modal = backdrop.querySelector(".modal") as HTMLElement;
  if (opts.onMount) opts.onMount(modal);

  return { close, root: modal };
}

export function confirmDialog(opts: { title: string; description: string; confirmLabel?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    const { close } = openModal({
      title: opts.title,
      bodyHtml: `<p class="muted">${opts.description}</p>`,
      footerHtml: `
        <button type="button" class="btn btn-outline" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-destructive" data-action="confirm">${opts.confirmLabel || "Confirm"}</button>
      `,
      onMount: (root) => {
        root.querySelector('[data-action="cancel"]')?.addEventListener("click", () => {
          close();
          resolve(false);
        });
        root.querySelector('[data-action="confirm"]')?.addEventListener("click", () => {
          close();
          resolve(true);
        });
      },
    });
  });
}
