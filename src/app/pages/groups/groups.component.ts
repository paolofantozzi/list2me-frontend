import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule,
  NbInputModule, NbToastrService, NbAlertModule, NbUserModule, NbBadgeModule
} from '@nebular/theme';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';
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
export class GroupsComponent implements OnInit {
  groups = signal<Group[]>([]);
  loading = signal(true);
  error = signal('');
  showCreateForm = signal(false);
  createLoading = signal(false);

  createForm: FormGroup;

  constructor(
    private groupService: GroupService,
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
}
