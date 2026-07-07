import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule,
  NbInputModule, NbToastrService, NbAlertModule, NbUserModule, NbBadgeModule
} from '@nebular/theme';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';
import { Group, GroupInvite, GroupMember } from '../../models/group.model';
import { UserPublic } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NbCardModule,
    NbIconModule,
    NbSpinnerModule,
    NbButtonModule,
    NbInputModule,
    NbAlertModule,
    NbUserModule,
    NbBadgeModule,
    PageHeaderComponent,
  ],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.scss'
})
export class GroupsComponent implements OnInit, OnDestroy {
  groups = signal<Group[]>([]);
  loading = signal(true);
  error = signal('');
  showCreateForm = signal(false);
  createLoading = signal(false);

  pendingInvites = signal<GroupInvite[]>([]);
  pendingInvitesLoading = signal(false);
  respondingInviteId = signal<string | null>(null);

  // Member management
  managingGroupId = signal<string | null>(null);
  members = signal<GroupMember[]>([]);
  membersLoading = signal(false);
  userSearchQuery = signal('');
  userSearchResults = signal<UserPublic[]>([]);
  userSearchLoading = signal(false);
  invitingUserId = signal<string | null>(null);
  removingUserId = signal<string | null>(null);

  createForm: FormGroup;

  private userSearch$ = new Subject<string>();

  constructor(
    private groupService: GroupService,
    private userService: UserService,
    private fb: FormBuilder,
    private toastr: NbToastrService,
    private auth: AuthService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.loadGroups();
    this.loadPendingInvites();

    this.userSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.userSearchLoading.set(true);
        return this.userService.searchUsers(q).pipe(
          catchError(() => { this.userSearchLoading.set(false); return of({ results: [], count: 0, next: null, previous: null }); })
        );
      })
    ).subscribe(resp => {
      this.userSearchResults.set(resp.results ?? []);
      this.userSearchLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.userSearch$.complete();
  }

  loadGroups(): void {
    this.loading.set(true);
    this.groupService.getGroups().subscribe({
      next: data => {
        this.groups.set(Array.isArray(data) ? data : (data as any).results ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load groups.');
        this.loading.set(false);
      }
    });
  }

  createGroup(): void {
    if (this.createForm.invalid) return;
    this.createLoading.set(true);

    this.groupService.createGroup(this.createForm.value).subscribe({
      next: group => {
        this.groups.update(gs => [group, ...gs]);
        this.createForm.reset();
        this.showCreateForm.set(false);
        this.createLoading.set(false);
        this.toastr.success('Gruppo creato!', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile creare il gruppo.', 'Errore');
        this.createLoading.set(false);
      }
    });
  }

  leaveGroup(group: Group): void {
    this.confirmDialog.confirm({
      title: 'Lascia gruppo',
      message: `Lasciare "${group.name}"?`,
      confirmLabel: 'Lascia',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.groupService.leaveGroup(group.id).subscribe({
        next: () => {
          this.groups.update(gs => gs.filter(g => g.id !== group.id));
          this.toastr.success('Hai lasciato il gruppo.', 'Fatto');
        },
        error: () => this.toastr.danger('Impossibile lasciare il gruppo.', 'Errore')
      });
    });
  }

  deleteGroup(group: Group): void {
    this.confirmDialog.confirm({
      title: 'Elimina gruppo',
      message: `Eliminare "${group.name}"?`,
      confirmLabel: 'Elimina',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.groupService.deleteGroup(group.id).subscribe({
        next: () => {
          this.groups.update(gs => gs.filter(g => g.id !== group.id));
          if (this.managingGroupId() === group.id) this.managingGroupId.set(null);
          this.toastr.success('Gruppo eliminato.', 'Eliminato');
        },
        error: () => this.toastr.danger('Impossibile eliminare il gruppo.', 'Errore')
      });
    });
  }

  isOwner(group: Group): boolean {
    const user = this.auth.currentUser();
    return !!user && group.owner.id === user.id;
  }

  loadPendingInvites(): void {
    this.pendingInvitesLoading.set(true);
    this.groupService.getPendingInvites().subscribe({
      next: data => {
        this.pendingInvites.set(Array.isArray(data) ? data : (data as any).results ?? []);
        this.pendingInvitesLoading.set(false);
      },
      // The backend endpoint is not deployed everywhere yet — fail silently rather
      // than showing an error toast for a feature the user didn't ask for.
      error: () => this.pendingInvitesLoading.set(false),
    });
  }

  acceptInvite(invite: GroupInvite): void {
    this.respondingInviteId.set(invite.id);
    this.groupService.acceptInvite(invite.group.id).subscribe({
      next: () => {
        this.pendingInvites.update(is => is.filter(i => i.id !== invite.id));
        this.respondingInviteId.set(null);
        this.loadGroups();
        this.toastr.success(`Sei entrato nel gruppo "${invite.group.name}".`, 'Fatto');
      },
      error: () => {
        this.respondingInviteId.set(null);
        this.toastr.danger('Impossibile accettare l\'invito.', 'Errore');
      }
    });
  }

  declineInvite(invite: GroupInvite): void {
    this.respondingInviteId.set(invite.id);
    this.groupService.declineInvite(invite.group.id).subscribe({
      next: () => {
        this.pendingInvites.update(is => is.filter(i => i.id !== invite.id));
        this.respondingInviteId.set(null);
        this.toastr.success('Invito rifiutato.', 'Fatto');
      },
      error: () => {
        this.respondingInviteId.set(null);
        this.toastr.danger('Impossibile rifiutare l\'invito.', 'Errore');
      }
    });
  }

  // ── Member management ────────────────────────────────────────────────────────

  toggleManage(group: Group): void {
    if (this.managingGroupId() === group.id) {
      this.managingGroupId.set(null);
      this.resetMemberPanel();
    } else {
      this.managingGroupId.set(group.id);
      this.resetMemberPanel();
      this.loadMembers(group.id);
    }
  }

  private resetMemberPanel(): void {
    this.members.set([]);
    this.userSearchQuery.set('');
    this.userSearchResults.set([]);
    this.userSearchLoading.set(false);
  }

  loadMembers(groupId: string): void {
    this.membersLoading.set(true);
    this.groupService.getMembers(groupId).subscribe({
      next: data => {
        this.members.set(Array.isArray(data) ? data : (data as any).results ?? []);
        this.membersLoading.set(false);
      },
      error: () => {
        this.membersLoading.set(false);
        this.toastr.danger('Impossibile caricare i membri.', 'Errore');
      }
    });
  }

  onUserSearchChange(q: string): void {
    this.userSearchQuery.set(q);
    if (q.trim().length < 2) {
      this.userSearchResults.set([]);
      this.userSearchLoading.set(false);
      return;
    }
    this.userSearch$.next(q.trim());
  }

  isMember(user: UserPublic): boolean {
    return this.members().some(m => m.user.id === user.id);
  }

  inviteUser(groupId: string, user: UserPublic): void {
    this.invitingUserId.set(user.id);
    this.groupService.inviteUser(groupId, user.id).subscribe({
      next: () => {
        this.invitingUserId.set(null);
        this.userSearchResults.update(rs => rs.filter(u => u.id !== user.id));
        this.toastr.success(`Invito inviato a ${user.username}.`, 'Successo');
      },
      error: () => {
        this.invitingUserId.set(null);
        this.toastr.danger('Impossibile inviare l\'invito.', 'Errore');
      }
    });
  }

  removeMember(groupId: string, member: GroupMember): void {
    this.confirmDialog.confirm({
      title: 'Rimuovi membro',
      message: `Rimuovere ${member.user.username} dal gruppo?`,
      confirmLabel: 'Rimuovi',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.removingUserId.set(member.user.id);
      this.groupService.removeMember(groupId, member.user.id).subscribe({
        next: () => {
          this.members.update(ms => ms.filter(m => m.user.id !== member.user.id));
          this.removingUserId.set(null);
          this.groups.update(gs => gs.map(g =>
            g.id === groupId ? { ...g, members_count: Math.max(0, g.members_count - 1) } : g
          ));
          this.toastr.success(`${member.user.username} rimosso dal gruppo.`, 'Fatto');
        },
        error: () => {
          this.removingUserId.set(null);
          this.toastr.danger('Impossibile rimuovere il membro.', 'Errore');
        }
      });
    });
  }

  get currentUserId(): string | undefined {
    return this.auth.currentUser()?.id;
  }
}
