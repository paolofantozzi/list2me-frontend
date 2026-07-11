import { Component, computed, signal, inject, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { UserChipComponent } from '../../shared/user-chip/user-chip.component';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface NavItem {
  title: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TuiIcon, UserChipComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  readonly navItems: NavItem[] = [
    { title: 'Dashboard', icon: '@tui.house', link: '/pages/dashboard' },
    { title: 'Le mie liste', icon: '@tui.list', link: '/pages/lists' },
    { title: 'Gruppi', icon: '@tui.users', link: '/pages/groups' },
    { title: 'Utenti', icon: '@tui.user', link: '/pages/users' },
  ];

  readonly sidebarOpen = signal(typeof window !== 'undefined' && window.innerWidth >= 1200);
  readonly userMenuOpen = signal(false);

  readonly currentUser = computed(() => this.auth.currentUser());
  readonly currentYear = new Date().getFullYear();
  readonly theme = computed(() => this.themeService.theme());

  readonly userFullName = computed(() => {
    const u = this.currentUser();
    if (!u) return '';
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return name || u.username;
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth < 1200) {
      this.sidebarOpen.set(false);
    }
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login']),
    });
  }

  // Chiude il menu utente al click fuori (il contenitore ferma la propagazione).
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }
}
