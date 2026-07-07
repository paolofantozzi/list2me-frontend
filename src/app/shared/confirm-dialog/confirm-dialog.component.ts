import { Component } from '@angular/core';
import { NbCardModule, NbButtonModule, NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NbCardModule, NbButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  title = 'Conferma';
  message = '';
  confirmLabel = 'Conferma';
  cancelLabel = 'Annulla';
  danger = false;

  constructor(private dialogRef: NbDialogRef<ConfirmDialogComponent>) {}

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
