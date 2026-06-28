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
import { Group, GroupMember } from '../../models/group.model';
import { UserPublic } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

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
    private auth: AuthService
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.loadGroups();

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
    if (!confirm(`Lasciare "${group.name}"?`)) return;
    this.groupService.leaveGroup(group.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.filter(g => g.id !== group.id));
        this.toastr.success('Hai lasciato il gruppo.', 'Fatto');
      },
      error: () => this.toastr.danger('Impossibile lasciare il gruppo.', 'Errore')
    });
  }

  deleteGroup(group: Group): void {
    if (!confirm(`Eliminare "${group.name}"?`)) return;
    this.groupService.deleteGroup(group.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.filter(g => g.id !== group.id));
        if (this.managingGroupId() === group.id) this.managingGroupId.set(null);
        this.toastr.success('Gruppo eliminato.', 'Eliminato');
      },
      error: () => this.toastr.danger('Impossibile eliminare il gruppo.', 'Errore')
    });
  }

  isOwner(group: Group): boolean {
    const user = this.auth.currentUser();
    return !!user && group.owner.id === user.id;
  }

  acceptInvite(group: Group): void {
    this.groupService.acceptInvite(group.id).subscribe({
      next: () => {
        this.loadGroups();
        this.toastr.success('Joined group!', 'Success');
      },
      error: () => this.toastr.danger('Could not accept invite.', 'Error')
    });
  }

  declineInvite(group: Group): void {
    this.groupService.declineInvite(group.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.filter(g => g.id !== group.id));
        this.toastr.success('Invitation declined.', 'Done');
      },
      error: () => this.toastr.danger('Could not decline invite.', 'Error')
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
    if (!confirm(`Rimuovere ${member.user.username} dal gruppo?`)) return;
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
  }

  get currentUserId(): string | undefined {
    return this.auth.currentUser()?.id;
  }
}
