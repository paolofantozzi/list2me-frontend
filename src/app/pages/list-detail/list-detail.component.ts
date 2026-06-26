import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbBadgeModule,
  NbInputModule, NbFormFieldModule, NbToastrService, NbAlertModule, NbTagModule
} from '@nebular/theme';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs';
import { ListService } from '../../services/list.service';
import { ItemService } from '../../services/item.service';
import { BookService } from '../../services/book.service';
import { List, Item } from '../../models/list.model';
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

  showBookSearch = signal(false);
  bookQuery = signal('');
  bookResults = signal<BookResult[]>([]);
  bookSearchLoading = signal(false);
  syncingItemId = signal<string | null>(null);

  addItemForm: FormGroup;
  editItemForm: FormGroup;

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
    });
    this.editItemForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(500)]],
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

    const position = String(this.items().length + 1);
    this.itemService.addItem(listId, { ...this.addItemForm.value, position }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.addItemForm.reset();
        this.showAddItem.set(false);
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
    this.editItemForm.setValue({ text: item.text });
  }

  saveEditItem(): void {
    const item = this.editingItem();
    if (!item || this.editItemForm.invalid) return;
    const listId = this.list()!.id;

    this.itemService.updateItem(listId, item.id, this.editItemForm.value).subscribe({
      next: updated => {
        this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
        this.editingItem.set(null);
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

  toggleAddItem(): void {
    this.showAddItem.update(v => !v);
    if (this.showAddItem()) this.showBookSearch.set(false);
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
