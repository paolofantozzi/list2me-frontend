import { Injectable } from '@angular/core';

type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

/**
 * Notifiche "toast" leggere, sostituiscono ToastService.
 * Firma compatibile (message, title?) con i vecchi call site: `.success()`,
 * `.danger()`, `.warning()`, `.info()`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private container?: HTMLElement;

  success(message: string, title?: string): void { this.show(message, title, 'success'); }
  danger(message: string, title?: string): void { this.show(message, title, 'danger'); }
  warning(message: string, title?: string): void { this.show(message, title, 'warning'); }
  info(message: string, title?: string): void { this.show(message, title, 'info'); }

  private ensureContainer(): HTMLElement {
    if (!this.container || !this.container.isConnected) {
      const el = document.createElement('div');
      el.className = 'l2m-toasts';
      document.body.appendChild(el);
      this.container = el;
    }
    return this.container;
  }

  private show(message: string, title: string | undefined, variant: ToastVariant): void {
    const toast = document.createElement('div');
    toast.className = `l2m-toast l2m-toast--${variant}`;

    if (title) {
      const strong = document.createElement('strong');
      strong.textContent = title;
      toast.appendChild(strong);
    }
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);

    this.ensureContainer().appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
}
