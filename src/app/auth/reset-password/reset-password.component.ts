import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TuiIcon, TuiButton, TuiLoader } from '@taiga-ui/core';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl) {
  const p1 = control.get('new_password1')?.value;
  const p2 = control.get('new_password2')?.value;
  return p1 === p2 ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    TuiIcon,
    TuiButton,
    TuiLoader,ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  done = signal(false);
  showPassword = signal(false);

  private uid = '';
  private token = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      new_password1: ['', [Validators.required, Validators.minLength(8)]],
      new_password2: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    this.uid = this.route.snapshot.paramMap.get('uid') ?? '';
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.uid || !this.token) {
      this.error.set('Link non valido. Richiedi un nuovo link di recupero.');
    }
  }

  getInputType(): string {
    return this.showPassword() ? 'text' : 'password';
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { new_password1, new_password2 } = this.form.value;
    this.auth.confirmPasswordReset(this.uid, this.token, new_password1, new_password2).subscribe({
      next: () => {
        this.done.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        const msg =
          err?.error?.token?.[0] ||
          err?.error?.uid?.[0] ||
          err?.error?.new_password2?.[0] ||
          err?.error?.detail ||
          'Impossibile reimpostare la password. Il link potrebbe essere scaduto.';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }
}
