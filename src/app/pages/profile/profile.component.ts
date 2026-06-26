import { Component, OnInit, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule,
  NbInputModule, NbFormFieldModule, NbToastrService, NbUserModule, NbAlertModule
} from '@nebular/theme';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';

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
  form: FormGroup;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private toastr: NbToastrService,
    private router: Router
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

  confirmDeactivate(): void {
    if (!confirm('Sei sicuro di voler disattivare il tuo account? Questa azione è irreversibile.')) return;
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
  }
}
