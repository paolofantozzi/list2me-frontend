import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { TuiIcon, TuiButton, TuiLoader } from '@taiga-ui/core';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    TuiIcon,
    TuiButton,
    TuiLoader,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  emailNotVerified = signal(false);
  resendLoading = signal(false);
  resendSuccess = signal(false);
  registered = signal(false);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.registered.set(true);
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
    this.emailNotVerified.set(false);
    this.resendSuccess.set(false);

    this.auth.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/pages/dashboard']),
      error: (err) => {
        this.handleLoginError(err);
        this.loading.set(false);
      }
    });
  }

  private handleLoginError(err: any): void {
    if (err?.status === 0) {
      this.error.set('Impossibile contattare il server. Controlla la connessione e riprova.');
      return;
    }

    if (err?.status === 429) {
      this.error.set('Troppi tentativi di accesso. Riprova tra qualche minuto.');
      return;
    }

    const details = err?.error?.error?.details;
    const nonFieldErrors: string[] = details?.non_field_errors ?? [];
    const combined = nonFieldErrors.join(' ').toLowerCase();

    if (combined.includes('verif')) {
      this.emailNotVerified.set(true);
    } else if (combined.includes('disabled')) {
      this.error.set('Il tuo account è stato disabilitato. Contatta l\'assistenza.');
    } else if (nonFieldErrors.length > 0) {
      this.error.set('Email o password non validi. Riprova.');
    } else {
      this.error.set('Si è verificato un errore imprevisto. Riprova più tardi.');
    }
  }

  resendVerification(): void {
    const email = this.form.get('email')?.value;
    if (!email) return;
    this.resendLoading.set(true);
    this.auth.resendVerificationEmail(email).subscribe({
      next: () => {
        this.resendLoading.set(false);
        this.resendSuccess.set(true);
      },
      error: () => {
        this.resendLoading.set(false);
        this.toastr.danger('Impossibile inviare l\'email. Riprova.', 'Errore');
      }
    });
  }

  loginWithGoogle(): void {
    const gis = (window as any).google?.accounts?.oauth2;
    if (!gis) {
      this.error.set('Libreria Google non disponibile. Ricarica la pagina.');
      return;
    }

    const client = gis.initTokenClient({
      client_id: environment.googleClientId,
      scope: 'openid email profile',
      callback: (resp: { access_token?: string; error?: string }) => {
        if (resp.error || !resp.access_token) {
          this.error.set('Accesso con Google non riuscito. Riprova.');
          return;
        }
        this.loading.set(true);
        this.error.set('');
        this.auth.googleLogin(resp.access_token).subscribe({
          next: () => this.router.navigate(['/pages/dashboard']),
          error: () => {
            this.error.set('Accesso con Google non riuscito. Riprova.');
            this.loading.set(false);
          }
        });
      }
    });

    client.requestAccessToken();
  }
}
