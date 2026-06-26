import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbBadgeModule,
  NbInputModule, NbFormFieldModule, NbToastrService, NbAlertModule, NbTagModule,
  NbSelectModule,
} from '@nebular/theme';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs';
import { ListService } from '../../services/list.service';
import { ItemService } from '../../services/item.service';
import { BookService } from '../../services/book.service';
import { List, Item, ListDiff, Suggestion, ListVisibility } from '../../models/list.model';
import { BookResult } from '../../models/book.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-list-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NbCardModule,
    NbIconModule,
    NbSpinnerModule,
    NbButtonModule,
    NbBadgeModule,
    NbInputModule,
    NbFormFieldModule,
    NbAlertModule,
    NbTagModule,
    NbSelectModule,
  ],
  templateUrl: './list-detail.component.html',
  styleUrl: './list-detail.component.scss'
})
export class ListDetailComponent implements OnInit, OnDestroy {
  list = signal<List | null>(null);
  items = signal<Item[]>([]);
  loading = signal(true);
  error = signal('');
  showAddItem = signal(false);
  addItemLoading = signal(false);
  editingItem = signal<Item | null>(null);

  // Book search
  showBookSearch = signal(false);
  bookQuery = signal('');
  bookResults = signal<BookResult[]>([]);
  bookSearchLoading = signal(false);
  syncingItemId = signal<string | null>(null);

  // Reorder
  reorderLoading = signal(false);

  // Nested lists (child_list)
  showNewChildList = signal(false);
  showEditChildList = signal(false);
  childListVisibilities: ListVisibility[] = ['public', 'private', 'group'];

  // Diff / merge
  showDiff = signal(false);
  diff = signal<ListDiff | null>(null);
  diffLoading = signal(false);
  mergeLoading = signal(false);

  // Suggestions
  suggestions = signal<Suggestion[]>([]);
  showSuggestions = signal(false);
  suggestionsLoading = signal(false);
  showSuggestForm = signal(false);

  addItemForm: FormGroup;
  editItemForm: FormGroup;
  suggestForm: FormGroup;

  private bookSearch$ = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listService: ListService,
    private itemService: ItemService,
    private bookService: BookService,
    private fb: FormBuilder,
    private toastr: NbToastrService,
    private auth: AuthService
  ) {
    this.addItemForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(500)]],
      new_child_list_title: [''],
      new_child_list_visibility: ['public'],
    });
    this.editItemForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(500)]],
      new_child_list_title: [''],
      new_child_list_visibility: ['public'],
    });
    this.suggestForm = this.fb.group({
      action: ['add', Validators.required],
      item_text: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadList(id);

    this.bookSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.bookSearchLoading.set(true);
        return this.bookService.search(q).pipe(
          catchError(() => {
            this.bookSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.bookResults.set(results);
      this.bookSearchLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.bookSearch$.complete();
  }

  loadList(id: string): void {
    this.loading.set(true);
    this.listService.getList(id).subscribe({
      next: list => {
        this.list.set(list);
        if (list.items) {
          this.items.set(list.items);
          this.loading.set(false);
        } else {
          this.loadItems(id);
        }
      },
      error: () => {
        this.error.set('Could not load list.');
        this.loading.set(false);
      }
    });
  }

  loadItems(listId: string): void {
    this.itemService.getItems(listId).subscribe({
      next: items => {
        this.items.set(Array.isArray(items) ? items : (items as any).results ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load items.');
        this.loading.set(false);
      }
    });
  }

  addItem(): void {
    if (this.addItemForm.invalid) return;
    const listId = this.list()!.id;
    this.addItemLoading.set(true);

    const { text, new_child_list_title, new_child_list_visibility } = this.addItemForm.value;
    const position = String(this.items().length + 1);
    const payload: Record<string, unknown> = { text, position };
    if (this.showNewChildList() && new_child_list_title?.trim()) {
      payload['new_child_list'] = { title: new_child_list_title.trim(), visibility: new_child_list_visibility };
    }

    this.itemService.addItem(listId, payload as Partial<Item>).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.addItemForm.reset({ new_child_list_visibility: 'public' });
        this.showAddItem.set(false);
        this.showNewChildList.set(false);
        this.addItemLoading.set(false);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.toastr.success('Elemento aggiunto!', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile aggiungere l\'elemento.', 'Errore');
        this.addItemLoading.set(false);
      }
    });
  }

  startEditItem(item: Item): void {
    this.editingItem.set(item);
    this.showEditChildList.set(false);
    this.editItemForm.setValue({ text: item.text, new_child_list_title: '', new_child_list_visibility: 'public' });
  }

  saveEditItem(): void {
    const item = this.editingItem();
    if (!item || this.editItemForm.invalid) return;
    const listId = this.list()!.id;

    const { text, new_child_list_title, new_child_list_visibility } = this.editItemForm.value;
    const payload: Record<string, unknown> = { text };
    if (this.showEditChildList() && new_child_list_title?.trim()) {
      payload['new_child_list'] = { title: new_child_list_title.trim(), visibility: new_child_list_visibility };
    }

    this.itemService.updateItem(listId, item.id, payload as Partial<Item>).subscribe({
      next: updated => {
        this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
        this.editingItem.set(null);
        this.showEditChildList.set(false);
        this.toastr.success('Elemento aggiornato!', 'Successo');
      },
      error: () => this.toastr.danger('Impossibile aggiornare l\'elemento.', 'Errore')
    });
  }

  deleteItem(item: Item): void {
    if (!confirm(`Eliminare questo elemento?`)) return;
    const listId = this.list()!.id;

    this.itemService.deleteItem(listId, item.id).subscribe({
      next: () => {
        this.items.update(items => items.filter(i => i.id !== item.id));
        this.list.update(l => l ? { ...l, items_count: Math.max(0, l.items_count - 1) } : l);
        this.toastr.success('Elemento eliminato.', 'Eliminato');
      },
      error: () => this.toastr.danger('Impossibile eliminare l\'elemento.', 'Errore')
    });
  }

  // ── Reorder ───────────────────────────────────────────────────────────────────

  moveItemUp(index: number): void {
    if (index === 0) return;
    const items = [...this.items()];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    this.items.set(items);
    this.saveOrder(items);
  }

  moveItemDown(index: number): void {
    const items = [...this.items()];
    if (index === items.length - 1) return;
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    this.items.set(items);
    this.saveOrder(items);
  }

  private saveOrder(items: Item[]): void {
    const listId = this.list()!.id;
    const order = items.map((item, i) => ({ id: item.id, position: i + 1 }));
    this.reorderLoading.set(true);
    this.itemService.reorderItems(listId, order).subscribe({
      next: () => this.reorderLoading.set(false),
      error: () => {
        this.reorderLoading.set(false);
        this.toastr.danger('Errore nel riordinare gli elementi.', 'Errore');
      }
    });
  }

  // ── Diff / merge ──────────────────────────────────────────────────────────────

  toggleDiff(): void {
    this.showDiff.update(v => !v);
    if (this.showDiff() && !this.diff()) {
      this.loadDiff();
    }
  }

  loadDiff(): void {
    this.diffLoading.set(true);
    this.listService.getDiff(this.list()!.id).subscribe({
      next: diff => { this.diff.set(diff); this.diffLoading.set(false); },
      error: () => {
        this.diffLoading.set(false);
        this.toastr.danger('Impossibile caricare il diff.', 'Errore');
      }
    });
  }

  mergeFork(): void {
    if (!confirm('Importare le modifiche dalla lista originale? Gli elementi aggiunti alla fonte verranno aggiunti e quelli rimossi verranno eliminati.')) return;
    const listId = this.list()!.id;
    this.mergeLoading.set(true);
    this.listService.mergeList(listId).subscribe({
      next: () => {
        this.mergeLoading.set(false);
        this.diff.set(null);
        this.showDiff.set(false);
        this.toastr.success('Lista aggiornata dalla fonte!', 'Merge completato');
        this.loadList(listId);
      },
      error: () => {
        this.mergeLoading.set(false);
        this.toastr.danger('Impossibile eseguire il merge.', 'Errore');
      }
    });
  }

  // ── Suggestions ───────────────────────────────────────────────────────────────

  toggleSuggestions(): void {
    this.showSuggestions.update(v => !v);
    if (this.showSuggestions()) {
      this.loadSuggestions();
    }
  }

  loadSuggestions(): void {
    this.suggestionsLoading.set(true);
    this.listService.getSuggestions(this.list()!.id).subscribe({
      next: s => { this.suggestions.set(s); this.suggestionsLoading.set(false); },
      error: () => this.suggestionsLoading.set(false)
    });
  }

  submitSuggestion(): void {
    if (this.suggestForm.invalid) return;
    const { action, item_text } = this.suggestForm.value;
    this.listService.createSuggestion(this.list()!.id, [{ action, item_text }]).subscribe({
      next: () => {
        this.suggestForm.reset({ action: 'add' });
        this.showSuggestForm.set(false);
        this.toastr.success('Suggerimento inviato!', 'Successo');
      },
      error: () => this.toastr.danger('Impossibile inviare il suggerimento.', 'Errore')
    });
  }

  acceptSuggestion(s: Suggestion): void {
    const listId = this.list()!.id;
    this.listService.acceptSuggestion(listId, s.id).subscribe({
      next: () => {
        this.suggestions.update(ss => ss.filter(x => x.id !== s.id));
        this.toastr.success('Suggerimento accettato e applicato.', 'Successo');
        this.loadList(listId);
      },
      error: () => this.toastr.danger('Impossibile accettare il suggerimento.', 'Errore')
    });
  }

  rejectSuggestion(s: Suggestion): void {
    this.listService.rejectSuggestion(this.list()!.id, s.id).subscribe({
      next: () => {
        this.suggestions.update(ss => ss.filter(x => x.id !== s.id));
        this.toastr.info('Suggerimento rifiutato.', 'Rifiutato');
      },
      error: () => this.toastr.danger('Impossibile rifiutare il suggerimento.', 'Errore')
    });
  }

  // ── Report ────────────────────────────────────────────────────────────────────

  reportList(): void {
    const reason = prompt('Motivo della segnalazione:');
    if (!reason?.trim()) return;
    this.listService.reportList(this.list()!.id, reason.trim()).subscribe({
      next: () => this.toastr.success('Lista segnalata.', 'Segnalata'),
      error: () => this.toastr.danger('Impossibile segnalare la lista.', 'Errore')
    });
  }

  // ── Fork ──────────────────────────────────────────────────────────────────────

  forkList(): void {
    const list = this.list();
    if (!list) return;
    this.listService.forkList(list.id).subscribe({
      next: forked => {
        this.toastr.success('Lista forkata!', 'Successo');
        this.router.navigate(['/pages/lists', forked.id]);
      },
      error: () => this.toastr.danger('Impossibile eseguire il fork.', 'Errore')
    });
  }

  toggleFollow(): void {
    const list = this.list();
    if (!list) return;
    const action = list.is_following
      ? this.listService.unfollowList(list.id)
      : this.listService.followList(list.id);

    action.subscribe({
      next: () => this.list.update(l => l ? { ...l, is_following: !l.is_following } : l),
      error: () => this.toastr.danger('Operazione fallita.', 'Errore')
    });
  }

  // ── Book search ──────────────────────────────────────────────────────────────

  onBookQueryChange(q: string): void {
    this.bookQuery.set(q);
    if (q.trim().length < 2) {
      this.bookResults.set([]);
      this.bookSearchLoading.set(false);
      return;
    }
    this.bookSearch$.next(q.trim());
  }

  addBookItem(book: BookResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);

    this.bookService.getBookItemTypeId().pipe(
      switchMap(typeId => this.itemService.addItem(listId, {
        text: book.title,
        ...(typeId ? { item_type: typeId } : {}),
        metadata: {
          author: book.author,
          isbn: book.isbn,
          cover_url: book.cover_url,
          open_library_key: book.open_library_key,
          year: book.year,
        },
        position,
      }))
    ).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.toastr.success(`"${book.title}" aggiunto!`, 'Libro aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere il libro.', 'Errore')
    });
  }

  syncBookItem(item: Item): void {
    const listId = this.list()!.id;
    this.syncingItemId.set(item.id);
    const key = item.metadata?.['open_library_key'] as string | undefined;

    this.bookService.syncBook(listId, item.id, key).subscribe({
      next: updated => {
        this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
        this.syncingItemId.set(null);
        this.toastr.success('Dati aggiornati da OpenLibrary.', 'Sincronizzato');
      },
      error: () => {
        this.syncingItemId.set(null);
        this.toastr.danger('Impossibile sincronizzare.', 'Errore');
      }
    });
  }

  navigateToChildList(listId: string): void {
    this.router.navigate(['/pages/lists', listId]);
  }

  unlinkChildList(item: Item): void {
    const listId = this.list()!.id;
    this.itemService.updateItem(listId, item.id, { child_list: null } as Partial<Item>).subscribe({
      next: updated => {
        this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
        this.toastr.success('Sotto-lista scollegata.', 'Successo');
      },
      error: () => this.toastr.danger('Impossibile scollegare la sotto-lista.', 'Errore')
    });
  }

  toggleAddItem(): void {
    this.showAddItem.update(v => !v);
    if (this.showAddItem()) {
      this.showBookSearch.set(false);
      this.showNewChildList.set(false);
    }
  }

  toggleBookSearch(): void {
    this.showBookSearch.update(v => !v);
    if (this.showBookSearch()) {
      this.showAddItem.set(false);
      this.bookResults.set([]);
      this.bookQuery.set('');
    }
  }

  closeBookSearch(): void {
    this.showBookSearch.set(false);
    this.bookResults.set([]);
    this.bookQuery.set('');
  }

  isBookItem(item: Item): boolean {
    return !!(item.metadata?.['cover_url'] || item.metadata?.['author'] || item.item_type_detail?.name === 'book');
  }

  bookMeta(item: Item): { author?: string; isbn?: string; cover_url?: string; year?: number | null } {
    return (item.metadata ?? {}) as { author?: string; isbn?: string; cover_url?: string; year?: number | null };
  }

  get isOwner(): boolean {
    const list = this.list();
    const user = this.auth.currentUser();
    return !!list && !!user && list.owner.id === user.id;
  }

  goBack(): void {
    this.router.navigate(['/pages/lists']);
  }
}
