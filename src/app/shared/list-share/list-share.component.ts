import { Component, Input, OnChanges, OnDestroy, SimpleChanges, signal } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { TuiIcon, TuiButton, TuiLoader } from '@taiga-ui/core';
import { UserChipComponent } from '../user-chip/user-chip.component';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs';
import { ListService } from '../../services/list.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';
import { ListShare, GroupVisibility } from '../../models/list.model';
import { Group } from '../../models/group.model';
import { UserPublic } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-list-share',
  standalone: true,
  imports: [TuiIcon, TuiButton, TuiLoader, UserChipComponent],
  templateUrl: './list-share.component.html',
  styleUrl: './list-share.component.scss',
})
export class ListShareComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) listId!: string;

  shares = signal<ListShare[]>([]);
  sharesLoading = signal(false);
  groupVisibilities = signal<GroupVisibility[]>([]);
  groupVisibilityLoading = signal(false);

  myGroups = signal<Group[]>([]);
  selectedGroupId = signal<string>('');
  newGroupPermission = signal<'view' | 'edit'>('view');
  addingGroup = signal(false);
  revokingGroupVisibilityId = signal<string | null>(null);

  userSearchQuery = signal('');
  userSearchResults = signal<UserPublic[]>([]);
  userSearchLoading = signal(false);
  newSharePermission = signal<'view' | 'edit'>('view');
  addingUserId = signal<string | null>(null);
  revokingShareId = signal<string | null>(null);

  private userSearch$ = new Subject<string>();

  constructor(
    private listService: ListService,
    private groupService: GroupService,
    private userService: UserService,
    private toastr: ToastService,
    private auth: AuthService,
    private confirmDialog: ConfirmDialogService,
  ) {
    this.userSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.userSearchLoading.set(true);
        return this.userService.searchUsers(q).pipe(
          catchError(() => of({ results: [], count: 0, next: null, previous: null }))
        );
      })
    ).subscribe(resp => {
      this.userSearchResults.set(resp.results ?? []);
      this.userSearchLoading.set(false);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listId'] && this.listId) {
      this.reload();
      this.groupService.getGroups().subscribe({
        next: gs => this.myGroups.set(Array.isArray(gs) ? gs : (gs as any).results ?? []),
        error: () => this.myGroups.set([]),
      });
    }
  }

  ngOnDestroy(): void {
    this.userSearch$.complete();
  }

  private reload(): void {
    this.sharesLoading.set(true);
    this.listService.getShares(this.listId).subscribe({
      next: shares => { this.shares.set(shares); this.sharesLoading.set(false); },
      error: () => this.sharesLoading.set(false),
    });
    this.groupVisibilityLoading.set(true);
    this.listService.getGroupVisibility(this.listId).subscribe({
      next: gvs => { this.groupVisibilities.set(gvs); this.groupVisibilityLoading.set(false); },
      error: () => this.groupVisibilityLoading.set(false),
    });
  }

  // ── Condivisione con utenti ─────────────────────────────────────────────────

  onUserSearchChange(q: string): void {
    this.userSearchQuery.set(q);
    if (q.trim().length < 2) {
      this.userSearchResults.set([]);
      this.userSearchLoading.set(false);
      return;
    }
    this.userSearch$.next(q.trim());
  }

  isAlreadyShared(user: UserPublic): boolean {
    return this.shares().some(s => s.shared_with.id === user.id);
  }

  get currentUserId(): string | undefined {
    return this.auth.currentUser()?.id;
  }

  shareWithUser(user: UserPublic): void {
    this.addingUserId.set(user.id);
    this.listService.shareList(this.listId, user.id, this.newSharePermission()).subscribe({
      next: share => {
        this.shares.update(ss => [...ss, share]);
        this.addingUserId.set(null);
        this.toastr.success(`Lista condivisa con ${user.username}.`, 'Successo');
      },
      error: () => {
        this.addingUserId.set(null);
        this.toastr.danger('Impossibile condividere la lista.', 'Errore');
      }
    });
  }

  revokeShare(share: ListShare): void {
    this.confirmDialog.confirm({
      title: 'Revoca accesso',
      message: `Revocare l'accesso di ${share.shared_with.username}?`,
      confirmLabel: 'Revoca',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.revokingShareId.set(share.id);
      this.listService.revokeShare(this.listId, share.id).subscribe({
        next: () => {
          this.shares.update(ss => ss.filter(s => s.id !== share.id));
          this.revokingShareId.set(null);
          this.toastr.success('Accesso revocato.', 'Fatto');
        },
        error: () => {
          this.revokingShareId.set(null);
          this.toastr.danger('Impossibile revocare l\'accesso.', 'Errore');
        }
      });
    });
  }

  changeSharePermission(share: ListShare, permission: 'view' | 'edit'): void {
    if (share.permission === permission) return;
    this.revokingShareId.set(share.id);
    this.listService.revokeShare(this.listId, share.id).subscribe({
      next: () => {
        this.listService.shareList(this.listId, share.shared_with.id, permission).subscribe({
          next: updated => {
            this.shares.update(ss => ss.map(s => s.id === share.id ? updated : s));
            this.revokingShareId.set(null);
            this.toastr.success('Permesso aggiornato.', 'Fatto');
          },
          error: () => {
            this.shares.update(ss => ss.filter(s => s.id !== share.id));
            this.revokingShareId.set(null);
            this.toastr.danger('Impossibile aggiornare il permesso.', 'Errore');
          }
        });
      },
      error: () => {
        this.revokingShareId.set(null);
        this.toastr.danger('Impossibile aggiornare il permesso.', 'Errore');
      }
    });
  }

  // ── Condivisione con gruppi ──────────────────────────────────────────────────

  get availableGroups(): Group[] {
    const usedIds = new Set(this.groupVisibilities().map(gv => gv.group.id));
    return this.myGroups().filter(g => !usedIds.has(g.id));
  }

  onSelectedGroupChange(event: Event): void {
    this.selectedGroupId.set((event.target as HTMLSelectElement).value);
  }

  addGroupVisibility(): void {
    const groupId = this.selectedGroupId();
    if (!groupId) return;
    this.addingGroup.set(true);
    this.listService.addGroupVisibility(this.listId, groupId, this.newGroupPermission()).subscribe({
      next: gv => {
        this.groupVisibilities.update(gvs => [...gvs, gv]);
        this.selectedGroupId.set('');
        this.addingGroup.set(false);
        this.toastr.success(`Lista visibile al gruppo "${gv.group.name}".`, 'Successo');
      },
      error: () => {
        this.addingGroup.set(false);
        this.toastr.danger('Impossibile condividere con il gruppo.', 'Errore');
      }
    });
  }

  revokeGroupVisibility(gv: GroupVisibility): void {
    this.confirmDialog.confirm({
      title: 'Rimuovi visibilità',
      message: `Rimuovere la visibilità per il gruppo "${gv.group.name}"?`,
      confirmLabel: 'Rimuovi',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.revokingGroupVisibilityId.set(gv.id);
      this.listService.removeGroupVisibility(this.listId, gv.id).subscribe({
        next: () => {
          this.groupVisibilities.update(gvs => gvs.filter(g => g.id !== gv.id));
          this.revokingGroupVisibilityId.set(null);
          this.toastr.success('Visibilità rimossa.', 'Fatto');
        },
        error: () => {
          this.revokingGroupVisibilityId.set(null);
          this.toastr.danger('Impossibile rimuovere la visibilità.', 'Errore');
        }
      });
    });
  }

  changeGroupPermission(gv: GroupVisibility, permission: 'view' | 'edit'): void {
    if (gv.permission === permission) return;
    this.revokingGroupVisibilityId.set(gv.id);
    this.listService.removeGroupVisibility(this.listId, gv.id).subscribe({
      next: () => {
        this.listService.addGroupVisibility(this.listId, gv.group.id, permission).subscribe({
          next: updated => {
            this.groupVisibilities.update(gvs => gvs.map(g => g.id === gv.id ? updated : g));
            this.revokingGroupVisibilityId.set(null);
            this.toastr.success('Permesso aggiornato.', 'Fatto');
          },
          error: () => {
            this.groupVisibilities.update(gvs => gvs.filter(g => g.id !== gv.id));
            this.revokingGroupVisibilityId.set(null);
            this.toastr.danger('Impossibile aggiornare il permesso.', 'Errore');
          }
        });
      },
      error: () => {
        this.revokingGroupVisibilityId.set(null);
        this.toastr.danger('Impossibile aggiornare il permesso.', 'Errore');
      }
    });
  }

  onSharePermissionSelectChange(event: Event): void {
    this.newSharePermission.set((event.target as HTMLSelectElement).value as 'view' | 'edit');
  }

  onGroupPermissionSelectChange(event: Event): void {
    this.newGroupPermission.set((event.target as HTMLSelectElement).value as 'view' | 'edit');
  }

  onShareRowPermissionChange(share: ListShare, event: Event): void {
    this.changeSharePermission(share, (event.target as HTMLSelectElement).value as 'view' | 'edit');
  }

  onGroupRowPermissionChange(gv: GroupVisibility, event: Event): void {
    this.changeGroupPermission(gv, (event.target as HTMLSelectElement).value as 'view' | 'edit');
  }
}
