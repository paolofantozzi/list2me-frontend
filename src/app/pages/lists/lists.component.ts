import { Component, OnInit, signal, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbBadgeModule,
  NbDialogModule, NbInputModule, NbFormFieldModule,
  NbToastrService, NbAlertModule, NbTagModule, NbCheckboxModule
} from '@nebular/theme';
import { ListService } from '../../services/list.service';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';
import { List, Item, ChildListDetail } from '../../models/list.model';
import { TagInputComponent } from '../../shared/tag-input/tag-input.component';

interface SublistEntry {
  item: Item;
  detail: ChildListDetail;
}

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

  // ── Sottoliste (child list) ──────────────────────────────────────────────
  expandedSublists = signal<Set<string>>(new Set());
  sublistsLoading = signal<Set<string>>(new Set());
  sublists = signal<Record<string, SublistEntry[]>>({});

  isSublistsExpanded(listId: string): boolean {
    return this.expandedSublists().has(listId);
  }

  toggleSublists(list: List, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const id = list.id;
    const expanded = new Set(this.expandedSublists());
    if (expanded.has(id)) {
      expanded.delete(id);
      this.expandedSublists.set(expanded);
      return;
    }
    expanded.add(id);
    this.expandedSublists.set(expanded);

    if (this.sublists()[id] !== undefined) return;

    this.sublistsLoading.update(s => new Set(s).add(id));
    this.itemService.getItems(id).subscribe({
      next: items => {
        const entries: SublistEntry[] = items
          .filter((i): i is Item & { child_list_detail: ChildListDetail } => !!i.child_list_detail)
          .map(item => ({ item, detail: item.child_list_detail }));
        this.sublists.update(s => ({ ...s, [id]: entries }));
        this.sublistsLoading.update(s => { const n = new Set(s); n.delete(id); return n; });
      },
      error: () => {
        this.sublistsLoading.update(s => { const n = new Set(s); n.delete(id); return n; });
        this.toastr.danger('Impossibile caricare le sottoliste.', 'Errore');
      }
    });
  }

  openSublist(childId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/pages/lists', childId]);
  }

  unlinkSublist(parentListId: string, entry: SublistEntry, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.itemService.updateItem(parentListId, entry.item.id, { child_list: null }).subscribe({
      next: () => {
        this.sublists.update(s => ({
          ...s,
          [parentListId]: (s[parentListId] ?? []).filter(e => e.item.id !== entry.item.id)
        }));
        this.toastr.success('Sottolista scollegata.', 'Successo');
      },
      error: () => this.toastr.danger('Impossibile scollegare la sottolista.', 'Errore')
    });
  }

  deleteSublist(parentListId: string, entry: SublistEntry, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`Eliminare definitivamente la sottolista "${entry.detail.title}"? L'operazione non è reversibile.`)) return;

    this.listService.deleteList(entry.detail.id).subscribe({
      next: () => {
        this.sublists.update(s => ({
          ...s,
          [parentListId]: (s[parentListId] ?? []).filter(e => e.item.id !== entry.item.id)
        }));
        this.toastr.success('Sottolista eliminata.', 'Eliminata');
      },
      error: () => this.toastr.danger('Impossibile eliminare la sottolista (solo il proprietario può farlo).', 'Errore')
    });
  }

  createForm: FormGroup;

  constructor(
    private listService: ListService,
    private itemService: ItemService,
    private auth: AuthService,
    private fb: FormBuilder,
    private toastr: NbToastrService,
    private router: Router,
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
