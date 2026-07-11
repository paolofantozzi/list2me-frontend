import { Injectable, inject } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Observable, map, defaultIfEmpty } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogOptions } from './confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialogs = inject(TuiDialogService);

  confirm(options: ConfirmDialogOptions): Observable<boolean> {
    return this.dialogs
      .open<boolean>(new PolymorpheusComponent(ConfirmDialogComponent), {
        size: 's',
        dismissible: true,
        closable: false,
        data: {
          title: options.title ?? 'Conferma',
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Conferma',
          cancelLabel: options.cancelLabel ?? 'Annulla',
          danger: options.danger ?? false,
        },
      })
      // Chiusura via Esc/overlay: l'observable completa senza emettere -> false.
      .pipe(
        map((result) => result === true),
        defaultIfEmpty(false),
      );
  }
}
