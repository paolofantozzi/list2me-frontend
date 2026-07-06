import { Component, OnInit, signal, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbBadgeModule,
  NbDialogModule, NbInputModule, NbFormFieldModule,
  NbToastrService, NbAlertModule, NbTagModule, NbCheckboxModule
} from '@nebular/theme';
import { ListService } from '../../services/list.service';
import { AuthService } from '../../services/auth.service';
import { List } from '../../models/list.model';
import { TagInputComponent } from '../../shared/tag-input/tag-input.component';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ReactiveFormsModule,
    NbCardModule,
    NbIconModule,
    NbSpinnerModule,
    NbButtonModule,
    NbBadgeModule,
    NbDialogModule,
    NbInputModule,
    NbFormFieldModule,
    NbAlertModule,
    NbTagModule,
    NbCheckboxModule,
    TagInputComponent,
  ],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.scss'
})
export class ListsComponent implements OnInit {
  lists = signal<List[]>([]);
  loading = signal(true);
  error = signal('');
  showCreateForm = signal(false);
  createLoading = signal(false);
  createTags = signal<string[]>([]);

  myLists = computed(() => {
    const uid = this.auth.currentUser()?.id;
    return this.lists().filter(l => l.owner.id === uid);
  });

  // Una lista non propria con visibility 'private' è raggiungibile solo perché
  // condivisa direttamente con l'utente (vedi le regole di accesso di GET /lists/
  // nello schema OpenAPI): è l'unico modo, oltre a owner/gruppo/pubblica, per cui
  // può comparire nella risposta.
  groupLists = computed(() => {
    const uid = this.auth.currentUser()?.id;
    return this.lists().filter(l => l.owner.id !== uid && l.visibility === 'group');
  });

  publicLists = computed(() => {
    const uid = this.auth.currentUser()?.id;
    return this.lists().filter(l => l.owner.id !== uid && l.visibility === 'public');
  });

  sharedLists = computed(() => {
    const uid = this.auth.currentUser()?.id;
    return this.lists().filter(l => l.owner.id !== uid && l.visibility === 'private');
  });

  canEdit(list: List): boolean {
    return list.my_permission === 'edit';
  }

  createForm: FormGroup;

  constructor(
    private listService: ListService,
    private auth: AuthService,
    private fb: FormBuilder,
    private toastr: NbToastrService,
  ) {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      visibility: ['private'],
    });
  }

  ngOnInit(): void {
    this.loadLists();
  }

  loadLists(): void {
    this.loading.set(true);
    this.listService.getLists().subscribe({
      next: data => {
        this.lists.set(data.results);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare le liste.');
        this.loading.set(false);
      }
    });
  }

  createList(): void {
    if (this.createForm.invalid) return;
    this.createLoading.set(true);

    this.listService.createList({ ...this.createForm.value, tags: this.createTags() }).subscribe({
      next: list => {
        this.lists.update(ls => [list, ...ls]);
        this.createForm.reset({ visibility: 'private' });
        this.createTags.set([]);
        this.showCreateForm.set(false);
        this.createLoading.set(false);
        this.toastr.success('Lista creata!', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile creare la lista.', 'Errore');
        this.createLoading.set(false);
      }
    });
  }

  deleteList(list: List, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`Eliminare "${list.title}"?`)) return;

    this.listService.deleteList(list.id).subscribe({
      next: () => {
        this.lists.update(ls => ls.filter(l => l.id !== list.id));
        this.toastr.success('Lista eliminata.', 'Eliminata');
      },
      error: () => this.toastr.danger('Impossibile eliminare la lista.', 'Errore')
    });
  }
}
