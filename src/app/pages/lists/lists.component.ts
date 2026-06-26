import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule, NbBadgeModule,
  NbDialogModule, NbInputModule, NbFormFieldModule,
  NbToastrService, NbAlertModule, NbTagModule, NbCheckboxModule
} from '@nebular/theme';
import { ListService } from '../../services/list.service';
import { List } from '../../models/list.model';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [
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

  createForm: FormGroup;

  constructor(
    private listService: ListService,
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

    this.listService.createList(this.createForm.value).subscribe({
      next: list => {
        this.lists.update(ls => [list, ...ls]);
        this.createForm.reset({ visibility: 'private' });
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
