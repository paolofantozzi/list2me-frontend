import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NbInputModule, NbButtonModule, NbIconModule, NbAlertModule, NbSpinnerModule } from '@nebular/theme';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
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
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
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

    this.auth.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/pages/dashboard']),
      error: () => {
        this.error.set('Email o password non validi. Riprova.');
        this.loading.set(false);
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
