import { Injectable } from '@angular/core';
import { NbDialogService } from '@nebular/theme';
import { Observable, map } from 'rxjs';
import { ConfirmDialogComponent } from './confirm-dialog.component';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private dialogService: NbDialogService) {}

  confirm(options: ConfirmDialogOptions): Observable<boolean> {
    const dialogRef = this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: options.title ?? 'Conferma',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Conferma',
        cancelLabel: options.cancelLabel ?? 'Annulla',
        danger: options.danger ?? false,
      },
    });
    return dialogRef.onClose.pipe(map(result => result === true));
  }
}
