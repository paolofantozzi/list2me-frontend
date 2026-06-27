import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NbInputModule, NbButtonModule, NbIconModule, NbAlertModule, NbSpinnerModule } from '@nebular/theme';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NbInputModule, NbButtonModule, NbIconModule, NbAlertModule, NbSpinnerModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  sent = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.requestPasswordReset(this.form.value.email).subscribe({
      next: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.email?.[0] || err?.error?.detail || 'Impossibile inviare l\'email. Riprova.';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }
}
