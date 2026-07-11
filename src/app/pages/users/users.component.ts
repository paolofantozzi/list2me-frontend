import { Component, OnInit, computed, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { combineLatest, debounceTime, distinctUntilChanged, switchMap, catchError, of, startWith } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { TuiIcon, TuiButton, TuiLoader } from '@taiga-ui/core';
import { UserChipComponent } from '../../shared/user-chip/user-chip.component';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { AdminUser, UserPublic } from '../../models/user.model';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

type AdminStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    TuiIcon,
    TuiButton,
    TuiLoader,
    UserChipComponent,
    ReactiveFormsModule,
    PageHeaderComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  searchControl = new FormControl('');
  users = signal<UserPublic[]>([]);
  loading = signal(false);
  error = signal('');
  total = signal(0);
  followingIds = new Set<string>();

  isAdmin = computed(() => !!this.authService.currentUser()?.is_staff);
  isSuperUser = computed(() => !!this.authService.currentUser()?.is_superuser);

  adminQueryControl = new FormControl('');
  adminStatusControl = new FormControl<AdminStatusFilter>('all');
  adminUsers = signal<AdminUser[]>([]);
  adminLoading = signal(false);
  adminTotal = signal(0);

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private toastr: ToastService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(query => {
        this.loading.set(true);
        this.error.set('');
        return this.userService.searchUsers(query ?? '').pipe(
          catchError(() => {
            this.error.set('Search failed.');
            return of({ count: 0, results: [], next: null, previous: null });
          })
        );
      })
    ).subscribe(result => {
      this.users.set(result.results);
      this.total.set(result.count);
      this.loading.set(false);
    });

    if (this.isAdmin()) {
      combineLatest([
        this.adminQueryControl.valueChanges.pipe(startWith(''), debounceTime(400), distinctUntilChanged()),
        this.adminStatusControl.valueChanges.pipe(startWith(this.adminStatusControl.value))
      ]).pipe(
        switchMap(([query, status]) => {
          this.adminLoading.set(true);
          const isActive = status === 'active' ? true : status === 'inactive' ? false : undefined;
          return this.userService.adminSearchUsers(query ?? '', isActive).pipe(
            catchError(() => {
              this.toastr.danger('Ricerca amministrazione fallita.', 'Errore');
              return of({ count: 0, results: [], next: null, previous: null });
            })
          );
        })
      ).subscribe(result => {
        this.adminUsers.set(result.results);
        this.adminTotal.set(result.count);
        this.adminLoading.set(false);
      });
    }
  }

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.userService.getFollowing(currentUser.id).subscribe({
        next: records => {
          records.forEach(r => this.followingIds.add(r.following.id));
        }
      });
    }
  }

  search(): void {
    const q = this.searchControl.value ?? '';
    this.loading.set(true);
    this.userService.searchUsers(q).subscribe({
      next: result => {
        this.users.set(result.results);
        this.total.set(result.count);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Search failed.');
        this.loading.set(false);
      }
    });
  }

  toggleFollow(user: UserPublic): void {
    const isFollowing = this.followingIds.has(user.id);
    const action = isFollowing
      ? this.userService.unfollowUser(user.id)
      : this.userService.followUser(user.id);

    action.subscribe({
      next: () => {
        if (isFollowing) {
          this.followingIds.delete(user.id);
        } else {
          this.followingIds.add(user.id);
        }
        this.users.update(us => [...us]);
      }
    });
  }

  isFollowing(user: UserPublic): boolean {
    return this.followingIds.has(user.id);
  }

  displayName(user: UserPublic): string {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.username;
  }

  isSelf(user: AdminUser): boolean {
    return user.id === this.authService.currentUser()?.id;
  }

  adminDeactivate(user: AdminUser): void {
    this.confirmDialog.confirm({
      title: 'Disattiva account',
      message: `Disattivare l'account di ${user.username}? L'utente non potrà più accedere.`,
      confirmLabel: 'Disattiva',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.userService.deactivateUser(user.id).subscribe({
        next: () => {
          this.adminUsers.update(us => us.map(u => (u.id === user.id ? { ...u, is_active: false } : u)));
          this.toastr.success(`Account di ${user.username} disattivato.`, 'Fatto');
        },
        error: (err) => this.handleDeactivateError(err)
      });
    });
  }

  adminReactivate(user: AdminUser): void {
    this.userService.reactivateUser(user.id).subscribe({
      next: () => {
        this.adminUsers.update(us => us.map(u => (u.id === user.id ? { ...u, is_active: true } : u)));
        this.toastr.success(`Account di ${user.username} riattivato.`, 'Fatto');
      },
      error: () => this.toastr.danger('Impossibile riattivare l\'account.', 'Errore')
    });
  }

  adminPromote(user: AdminUser): void {
    this.confirmDialog.confirm({
      title: 'Promuovi ad amministratore',
      message: `Promuovere ${user.username} ad amministratore?`,
      confirmLabel: 'Promuovi',
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.userService.promoteUser(user.id).subscribe({
        next: () => this.toastr.success(`${user.username} è ora amministratore.`, 'Fatto'),
        error: () => this.toastr.danger('Impossibile promuovere l\'utente.', 'Errore')
      });
    });
  }

  private handleDeactivateError(err: any): void {
    const code = err?.error?.error?.code;
    if (code === 'ADMIN_CANNOT_TARGET_SELF') {
      this.toastr.danger('Non puoi disattivare il tuo stesso account da qui.', 'Errore');
    } else if (code === 'ADMIN_TARGET_IS_STAFF') {
      this.toastr.danger('Non puoi disattivare un altro account admin.', 'Errore');
    } else {
      this.toastr.danger('Impossibile disattivare l\'account.', 'Errore');
    }
  }
}
