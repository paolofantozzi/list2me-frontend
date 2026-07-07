import { Component, OnInit, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule,
  NbInputModule, NbFormFieldModule, NbToastrService, NbUserModule, NbAlertModule
} from '@nebular/theme';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    NbCardModule,
    NbIconModule,
    NbSpinnerModule,
    NbButtonModule,
    NbInputModule,
    NbFormFieldModule,
    NbAlertModule,
    NbUserModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  currentUser = computed(() => this.auth.currentUser());
  editing = signal(false);
  loading = signal(false);
  avatarUploading = signal(false);
  form: FormGroup;

  avatarPicture(): string {
    const user = this.currentUser();
    return user?.avatar || user?.avatar_url || '';
  }

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private toastr: NbToastrService,
    private router: Router,
    private confirmDialog: ConfirmDialogService
  ) {
    this.form = this.fb.group({
      first_name: [''],
      last_name: [''],
      bio: [''],
      avatar_url: [''],
    });
  }

  ngOnInit(): void {
    this.auth.me().subscribe();
  }

  startEditing(): void {
    const user = this.currentUser();
    if (!user) return;
    this.form.patchValue({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      bio: user.bio || '',
      avatar_url: user.avatar_url || '',
    });
    this.editing.set(true);
  }

  saveProfile(): void {
    this.loading.set(true);
    this.auth.updateMe(this.form.value).subscribe({
      next: () => {
        this.editing.set(false);
        this.loading.set(false);
        this.toastr.success('Profilo aggiornato!', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile aggiornare il profilo.', 'Errore');
        this.loading.set(false);
      }
    });
  }

  uploadAvatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarUploading.set(true);
    this.auth.uploadAvatar(file).subscribe({
      next: () => {
        this.avatarUploading.set(false);
        this.toastr.success('Avatar aggiornato!', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile caricare l\'avatar.', 'Errore');
        this.avatarUploading.set(false);
      }
    });
  }

  removeAvatar(): void {
    this.confirmDialog.confirm({
      title: 'Rimuovi avatar',
      message: "Rimuovere l'avatar caricato?",
      confirmLabel: 'Rimuovi',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.auth.removeAvatar().subscribe({
        next: () => this.toastr.success('Avatar rimosso!', 'Successo'),
        error: () => this.toastr.danger('Impossibile rimuovere l\'avatar.', 'Errore')
      });
    });
  }

  confirmDeactivate(): void {
    this.confirmDialog.confirm({
      title: 'Disattiva account',
      message: 'Sei sicuro di voler disattivare il tuo account? Questa azione è irreversibile.',
      confirmLabel: 'Disattiva',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
    });
  }
}
