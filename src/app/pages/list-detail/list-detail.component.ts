import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbBadgeModule,
  NbInputModule, NbFormFieldModule, NbToastrService, NbAlertModule, NbTagModule,
  NbSelectModule,
} from '@nebular/theme';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs';
import { ListService } from '../../services/list.service';
import { ItemService } from '../../services/item.service';
import { ItemTypeService } from '../../services/item-type.service';
import { BookService } from '../../services/book.service';
import { TvdbService } from '../../services/tvdb.service';
import { List, Item, ListDiff, Suggestion, ListVisibility } from '../../models/list.model';
import { ItemType } from '../../models/item-type.model';
import { BookResult, BookEdition } from '../../models/book.model';
import { TvdbSearchResult } from '../../models/tvdb.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-list-detail',
  standalone: true,
  imports: [
    SlicePipe,
    ReactiveFormsModule,
    DragDropModule,
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

  // Item types (loaded from API)
  itemTypes = signal<ItemType[]>([]);
  itemTypesLoading = signal(false);
  selectedType = signal<ItemType | null>(null);

  // Add item flow
  showTypePicker = signal(false);
  showAddItem = signal(false);
  addItemLoading = signal(false);
  editingItem = signal<Item | null>(null);

  // Book search
  showBookSearch = signal(false);
  bookQuery = signal('');
  bookResults = signal<BookResult[]>([]);
  bookSearchLoading = signal(false);
  syncingItemId = signal<string | null>(null);

  // Book editions
  showEditions = signal(false);
  editionsBook = signal<BookResult | null>(null);
  editions = signal<BookEdition[]>([]);
  editionsLoading = signal(false);

  // TVDB search
  showTvdbSearch = signal(false);
  tvdbQuery = signal('');
  tvdbResults = signal<TvdbSearchResult[]>([]);
  tvdbSearchLoading = signal(false);
  tvdbLanguage = signal('ita');
  tvdbType = signal('');

  // Reorder
  reorderLoading = signal(false);

  // Nested lists (child_list)
  showNewChildList = signal(false);
  showEditChildList = signal(false);
  childListVisibilities: ListVisibility[] = ['public', 'private', 'group'];

  // Item detail
  detailItem = signal<Item | null>(null);

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
  private tvdbSearch$ = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listService: ListService,
    private itemService: ItemService,
    private itemTypeService: ItemTypeService,
    private bookService: BookService,
    private tvdbService: TvdbService,
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

    this.itemTypesLoading.set(true);
    this.itemTypeService.getItemTypes().subscribe({
      next: resp => { this.itemTypes.set(resp.results); this.itemTypesLoading.set(false); },
      error: () => this.itemTypesLoading.set(false),
    });

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

    this.tvdbSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.tvdbSearchLoading.set(true);
        return this.tvdbService.search(q, this.tvdbType() || undefined, this.tvdbLanguage()).pipe(
          catchError(() => {
            this.tvdbSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.tvdbResults.set(results);
      this.tvdbSearchLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.bookSearch$.complete();
    this.tvdbSearch$.complete();
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
    const type = this.selectedType();
    if (type) payload['item_type'] = type.id;
    if (this.showNewChildList() && new_child_list_title?.trim()) {
      payload['new_child_list'] = { title: new_child_list_title.trim(), visibility: new_child_list_visibility };
    }

    this.itemService.addItem(listId, payload as Partial<Item>).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.addItemLoading.set(false);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
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

  onItemDropped(event: CdkDragDrop<Item[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const items = [...this.items()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
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
    if (this.showDiff()) {
      this.diff.set(null);
      this.loadDiff();
    }
  }

  loadDiff(): void {
    this.diffLoading.set(true);
    this.listService.getDiff(this.list()!.id).subscribe({
      next: resp => {
        this.diff.set(resp);
        this.diffLoading.set(false);
      },
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

  // ── Add item panel flow ────────────────────────────────────────────────────────

  openAddPanel(): void {
    this.showTypePicker.set(true);
    this.showAddItem.set(false);
    this.showBookSearch.set(false);
    this.showTvdbSearch.set(false);
    this.showEditions.set(false);
    this.showNewChildList.set(false);
  }

  selectItemType(type: ItemType): void {
    this.selectedType.set(type);
    this.showTypePicker.set(false);
    if (type.name === 'book') {
      this.showBookSearch.set(true);
      this.bookResults.set([]);
      this.bookQuery.set('');
    } else if (['series', 'movie', 'episode'].includes(type.name)) {
      this.showTvdbSearch.set(true);
      this.tvdbResults.set([]);
      this.tvdbQuery.set('');
      this.tvdbType.set(type.name === 'episode' ? '' : type.name);
    } else {
      this.showAddItem.set(true);
    }
  }

  getDefaultIcon(name: string): string {
    const icons: Record<string, string> = {
      book: 'book-outline',
      series: 'tv-outline',
      movie: 'film-outline',
      episode: 'play-circle-outline',
      text: 'edit-2-outline',
    };
    return icons[name] ?? 'list-outline';
  }

  backToTypePicker(): void {
    this.selectedType.set(null);
    this.showAddItem.set(false);
    this.showBookSearch.set(false);
    this.showTvdbSearch.set(false);
    this.showEditions.set(false);
    this.bookResults.set([]);
    this.bookQuery.set('');
    this.tvdbResults.set([]);
    this.tvdbQuery.set('');
    this.showNewChildList.set(false);
    this.showTypePicker.set(true);
  }

  closeAddPanel(): void {
    this.selectedType.set(null);
    this.showTypePicker.set(false);
    this.showAddItem.set(false);
    this.showBookSearch.set(false);
    this.showTvdbSearch.set(false);
    this.showEditions.set(false);
    this.bookResults.set([]);
    this.bookQuery.set('');
    this.tvdbResults.set([]);
    this.tvdbQuery.set('');
    this.showNewChildList.set(false);
    this.addItemForm.reset({ new_child_list_visibility: 'public' });
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
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'book')?.id ?? null;

    this.itemService.addItem(listId, {
      text: book.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        author: book.author,
        isbn: book.isbn,
        cover_url: book.cover_url,
        open_library_key: book.open_library_key,
        year: book.year,
        service_url: book.service_url || undefined,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
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

  // ── Book editions ─────────────────────────────────────────────────────────────

  openEditions(book: BookResult): void {
    this.editionsBook.set(book);
    this.showEditions.set(true);
    this.editions.set([]);
    this.editionsLoading.set(true);
    this.bookService.getEditions(book.open_library_key).subscribe({
      next: eds => { this.editions.set(eds); this.editionsLoading.set(false); },
      error: () => {
        this.editionsLoading.set(false);
        this.toastr.danger('Impossibile caricare le edizioni.', 'Errore');
      }
    });
  }

  closeEditions(): void {
    this.showEditions.set(false);
    this.editionsBook.set(null);
    this.editions.set([]);
  }

  addEditionItem(edition: BookEdition): void {
    const book = this.editionsBook()!;
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const title = edition.title || book.title;
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'book')?.id ?? null;

    this.itemService.addItem(listId, {
      text: title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        author: book.author,
        isbn: edition.isbn || book.isbn,
        cover_url: edition.cover_url || book.cover_url,
        open_library_key: book.open_library_key,
        year: edition.year ?? book.year,
        service_url: edition.service_url || book.service_url || undefined,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${title}" aggiunto!`, 'Libro aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere il libro.', 'Errore')
    });
  }

  // ── TVDB search ──────────────────────────────────────────────────────────────

  onTvdbQueryChange(q: string): void {
    this.tvdbQuery.set(q);
    if (q.trim().length < 2) {
      this.tvdbResults.set([]);
      this.tvdbSearchLoading.set(false);
      return;
    }
    this.tvdbSearch$.next(q.trim());
  }

  onTvdbLanguageChange(event: Event): void {
    this.tvdbLanguage.set((event.target as HTMLSelectElement).value);
  }

  onTvdbTypeSelectChange(event: Event): void {
    this.onTvdbTypeChange((event.target as HTMLSelectElement).value);
  }

  onTvdbTypeChange(type: string): void {
    this.tvdbType.set(type);
    if (this.tvdbQuery().trim().length >= 2) {
      this.tvdbResults.set([]);
      this.tvdbSearch$.next(this.tvdbQuery().trim());
    }
  }

  addTvdbItem(result: TvdbSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeName = this.selectedType()?.name
      ?? (result.metadata.type === 'movie' ? 'movie' : result.metadata.type === 'episode' ? 'episode' : 'series');
    const typeId = this.itemTypes().find(t => t.name === typeName)?.id ?? null;

    const meta = result.metadata;
    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        thetvdb_id: meta.thetvdb_id || undefined,
        type: meta.type || undefined,
        slug: meta.slug || undefined,
        network: meta.network || undefined,
        status: meta.status || undefined,
        image_url: result.image_url || meta.image_url || undefined,
        language: meta.language || this.tvdbLanguage(),
        service_url: result.service_url || meta.service_url || undefined,
        ...(meta.year ? { year: parseInt(meta.year, 10) || undefined } : {}),
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${result.title}" aggiunto!`, 'Aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere l\'elemento.', 'Errore')
    });
  }

  isBookItem(item: Item): boolean {
    return !!(item.metadata?.['cover_url'] || item.metadata?.['author'] || item.item_type_detail?.name === 'book');
  }

  isTvdbItem(item: Item): boolean {
    const name = item.item_type_detail?.name;
    return name === 'series' || name === 'movie' || name === 'episode';
  }

  bookMeta(item: Item): { author?: string; isbn?: string; cover_url?: string; year?: number | null; service_url?: string } {
    return (item.metadata ?? {}) as { author?: string; isbn?: string; cover_url?: string; year?: number | null; service_url?: string };
  }

  tvdbMeta(item: Item): { image_url?: string; network?: string; status?: string; year?: number; service_url?: string; type?: string } {
    return (item.metadata ?? {}) as { image_url?: string; network?: string; status?: string; year?: number; service_url?: string; type?: string };
  }

  openDetail(item: Item): void {
    this.detailItem.update(current => current?.id === item.id ? null : item);
  }

  get hasBookItems(): boolean {
    return this.items().some(item => this.isBookItem(item));
  }

  get hasTvdbItems(): boolean {
    return this.items().some(item => this.isTvdbItem(item));
  }

  get hasExternalItems(): boolean {
    return this.hasBookItems || this.hasTvdbItems;
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
