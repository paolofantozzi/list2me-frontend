import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbAlertModule
} from '@nebular/theme';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbAlertModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit {
  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const key = this.route.snapshot.paramMap.get('key') ?? '';
    if (!key) {
      this.errorMessage.set('Link di verifica non valido.');
      this.status.set('error');
      return;
    }
    this.auth.verifyEmail(key).subscribe({
      next: () => this.status.set('success'),
      error: (err) => {
        const detail = err?.error?.detail ?? err?.error?.key?.[0] ?? '';
        if (detail.toLowerCase().includes('already confirmed') || detail.toLowerCase().includes('già confermata')) {
          this.status.set('success');
        } else {
          this.errorMessage.set('Il link di verifica non è valido o è scaduto.');
          this.status.set('error');
        }
      },
    });
  }
}
