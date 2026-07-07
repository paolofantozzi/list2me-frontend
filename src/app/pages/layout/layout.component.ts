import { Component, OnInit, computed } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import {
  NbLayoutModule, NbSidebarModule, NbMenuModule, NbContextMenuModule,
  NbUserModule, NbIconModule, NbActionsModule, NbButtonModule,
  NbSidebarService, NbMenuService, NbMenuItem, NbToastrService
} from '@nebular/theme';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    NbLayoutModule,
    NbSidebarModule,
    NbMenuModule,
    NbContextMenuModule,
    NbUserModule,
    NbIconModule,
    NbActionsModule,
    NbButtonModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  menuItems: NbMenuItem[] = [
    {
      title: 'Dashboard',
      icon: 'home-outline',
      link: '/pages/dashboard',
    },
    {
      title: 'Le mie liste',
      icon: 'list-outline',
      link: '/pages/lists',
    },
    {
      title: 'Gruppi',
      icon: 'people-outline',
      link: '/pages/groups',
    },
    {
      title: 'Utenti',
      icon: 'person-outline',
      link: '/pages/users',
    },
  ];

  userMenuItems: NbMenuItem[] = [
    { title: 'Profilo', icon: 'person-outline', link: '/pages/profile' },
    { title: 'Esci', icon: 'log-out-outline', data: { action: 'logout' } },
  ];

  currentUser = computed(() => this.auth.currentUser());
  currentYear = new Date().getFullYear();
  theme = computed(() => this.themeService.theme());

  userFullName = computed(() => {
    const u = this.currentUser();
    if (!u) return '';
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return name || u.username;
  });

  constructor(
    private sidebarService: NbSidebarService,
    private menuService: NbMenuService,
    private auth: AuthService,
    private router: Router,
    private toastr: NbToastrService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.menuService.onItemClick().subscribe(({ item }) => {
      if ((item.data as { action?: string } | undefined)?.action === 'logout') {
        this.logout();
      }
      // Collapse sidebar after navigation on non-desktop viewports
      if (item.link && window.innerWidth < 1200) {
        this.sidebarService.collapse('left');
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarService.toggle(true, 'left');
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login']),
    });
  }
}
