import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NbInputModule, NbButtonModule, NbIconModule, NbAlertModule, NbSpinnerModule } from '@nebular/theme';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl) {
  const password1 = control.get('password1')?.value;
  const password2 = control.get('password2')?.value;
  return password1 === password2 ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NbInputModule,
    NbButtonModule,
    NbIconModule,
    NbAlertModule,
    NbSpinnerModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.minLength(3), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email]],
      password1: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required],
      bio: [''],
    }, { validators: passwordMatchValidator });
  }

  getInputType(): string {
    return this.showPassword() ? 'text' : 'password';
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl?.hasError(error) && (ctrl.dirty || ctrl.touched);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { username, ...rest } = this.form.value;
    const payload = username?.trim() ? { username: username.trim(), ...rest } : rest;

    this.auth.register(payload).subscribe({
      next: () => this.router.navigate(['/pages/dashboard']),
      error: (err) => {
        const msg = err?.error?.detail || err?.error?.username?.[0] || err?.error?.email?.[0]
          || 'Registration failed. Please check your details and try again.';
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }
}
