import { Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [TuiButton],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  private readonly context =
    injectContext<TuiDialogContext<boolean, ConfirmDialogOptions>>();

  get title(): string { return this.context.data.title ?? 'Conferma'; }
  get message(): string { return this.context.data.message; }
  get confirmLabel(): string { return this.context.data.confirmLabel ?? 'Conferma'; }
  get cancelLabel(): string { return this.context.data.cancelLabel ?? 'Annulla'; }
  get danger(): boolean { return this.context.data.danger ?? false; }

  confirm(): void { this.context.completeWith(true); }
  cancel(): void { this.context.completeWith(false); }
}
