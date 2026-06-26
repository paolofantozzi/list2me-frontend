import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbBadgeModule,
  NbInputModule, NbFormFieldModule, NbToastrService, NbAlertModule, NbTagModule
} from '@nebular/theme';
import { ListService } from '../../services/list.service';
import { ItemService } from '../../services/item.service';
import { List, Item } from '../../models/list.model';
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
export class ListDetailComponent implements OnInit {
  list = signal<List | null>(null);
  items = signal<Item[]>([]);
  loading = signal(true);
  error = signal('');
  showAddItem = signal(false);
  addItemLoading = signal(false);
  editingItem = signal<Item | null>(null);

  addItemForm: FormGroup;
  editItemForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listService: ListService,
    private itemService: ItemService,
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

    const position = this.items().length + 1;
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

  get isOwner(): boolean {
    const list = this.list();
    const user = this.auth.currentUser();
    return !!list && !!user && list.owner.id === user.id;
  }

  goBack(): void {
    this.router.navigate(['/pages/lists']);
  }
}
