import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { SlicePipe, DecimalPipe, DatePipe } from '@angular/common';
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
import { MusicBrainzService } from '../../services/musicbrainz.service';
import { PlaceService } from '../../services/place.service';
import { EuropeanaService } from '../../services/europeana.service';
import { OpenFoodFactsService } from '../../services/openfoodfacts.service';
import { BggService } from '../../services/bgg.service';
import { IgdbService } from '../../services/igdb.service';
import { WikivoyageService } from '../../services/wikivoyage.service';
import { SeatGeekService } from '../../services/seatgeek.service';
import { MedicineService } from '../../services/medicine.service';
import { PlantService } from '../../services/plant.service';
import { List, Item, ListDiff, Suggestion, ListVisibility } from '../../models/list.model';
import { ItemType } from '../../models/item-type.model';
import { BookResult, BookEdition } from '../../models/book.model';
import { TvdbSearchResult, TvdbEpisode, TvdbEpisodesPage } from '../../models/tvdb.model';
import { MusicBrainzEntityType, MusicBrainzSearchResult } from '../../models/musicbrainz.model';
import { PlaceSearchResult } from '../../models/place.model';
import { EuropeanaEntityType, EuropeanaSearchResult } from '../../models/europeana.model';
import { OpenFoodFactsDomain, OpenFoodFactsSearchResult } from '../../models/openfoodfacts.model';
import { BGGSearchType, BGGSearchResult } from '../../models/bgg.model';
import { IGDBSearchResult } from '../../models/igdb.model';
import { WikivoyageSearchResult } from '../../models/wikivoyage.model';
import { SeatGeekSearchResult } from '../../models/seatgeek.model';
import { MedicineResult } from '../../models/medicine.model';
import { PlantSearchResult } from '../../models/plant.model';
import { AuthService } from '../../services/auth.service';
import { PlaceMapComponent } from '../../shared/place-map/place-map.component';
import { TagInputComponent } from '../../shared/tag-input/tag-input.component';
import { ListShareComponent } from '../../shared/list-share/list-share.component';
import { ExternalSearchPanelComponent, AttributionLogo } from '../../shared/external-search-panel/external-search-panel.component';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { ItemRowComponent, ItemRowBadge } from '../../shared/item-row/item-row.component';
import { ItemDetailExpandComponent, ItemDetailRow, ItemDetailLink } from '../../shared/item-detail-expand/item-detail-expand.component';

@Component({
  selector: 'app-list-detail',
  standalone: true,
  imports: [
    SlicePipe,
    DecimalPipe,
    DatePipe,
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
    PlaceMapComponent,
    TagInputComponent,
    ListShareComponent,
    ExternalSearchPanelComponent,
    ItemRowComponent,
    ItemDetailExpandComponent,
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

  // MusicBrainz search — query/risultati/loading gestiti internamente da ExternalSearchPanelComponent
  showMusicSearch = signal(false);

  // Place search (Nominatim)
  showPlaceSearch = signal(false);
  placeQuery = signal('');
  placeResults = signal<PlaceSearchResult[]>([]);
  placeSearchLoading = signal(false);
  placeManualMode = signal(false);
  placePickedLat = signal<number | null>(null);
  placePickedLon = signal<number | null>(null);
  placeReverseResult = signal<PlaceSearchResult | null>(null);
  placeReverseLoading = signal(false);
  placeAddLoading = signal(false);

  // Europeana search — query/risultati/loading gestiti internamente da ExternalSearchPanelComponent
  showEuropeanaSearch = signal(false);

  // BoardGameGeek search (board_game / rpg) — query/risultati/loading gestiti internamente da ExternalSearchPanelComponent
  showBggSearch = signal(false);

  // IGDB search (video_game) — query/risultati/loading gestiti internamente da ExternalSearchPanelComponent
  showVideoGameSearch = signal(false);

  // Wikivoyage search (travel_destination) — query/risultati/loading gestiti internamente da ExternalSearchPanelComponent
  showTravelSearch = signal(false);
  travelLanguage = signal('en');

  // SeatGeek search (concert) — query/risultati/loading gestiti internamente da ExternalSearchPanelComponent
  showConcertSearch = signal(false);

  // AIFA search (medicine)
  showMedicineSearch = signal(false);
  medicineQuery = signal('');
  medicineResults = signal<MedicineResult[]>([]);
  medicineSearchLoading = signal(false);

  // Perenual search (plant) — query/risultati/loading gestiti internamente da ExternalSearchPanelComponent
  showPlantSearch = signal(false);

  // Open Food/Beauty/Products Facts search
  showProductSearch = signal(false);
  productQuery = signal('');
  productResults = signal<OpenFoodFactsSearchResult[]>([]);
  productSearchLoading = signal(false);
  productBarcodeMode = signal(false);
  productBarcode = signal('');
  productBarcodeResult = signal<OpenFoodFactsSearchResult | null>(null);
  productBarcodeLoading = signal(false);
  productBarcodeError = signal('');

  // Image item creation panel
  showImagePanel = signal(false);
  pendingImageCaption = signal('');
  pendingImageFile = signal<File | null>(null);
  pendingImagePreviewUrl = signal<string | null>(null);
  imageAddLoading = signal(false);

  // Item image upload
  imageUploadingItemId = signal<string | null>(null);

  // Episode picker (drill-down from series)
  showEpisodePicker = signal(false);
  episodeSeriesId = signal<number | null>(null);
  episodeSeriesName = signal('');
  episodesPage = signal<TvdbEpisodesPage | null>(null);
  episodesLoading = signal(false);
  episodeSeasonFilter = signal<number | null>(null);

  // Reorder
  reorderLoading = signal(false);

  // Nested lists (child_list)
  showNewChildList = signal(false);
  showEditChildList = signal(false);
  childListVisibilities: ListVisibility[] = ['public', 'private', 'group'];

  // Item detail
  detailItem = signal<Item | null>(null);

  // Condivisione lista (utenti + gruppi)
  showSharePanel = signal(false);

  // Copia elemento in un'altra lista
  copySourceItem = signal<Item | null>(null);
  copyDestinations = signal<List[]>([]);
  copyDestinationsLoading = signal(false);
  copySelectedListId = signal('');
  copyLoading = signal(false);

  // Tag editing
  editingTags = signal(false);
  pendingTags = signal<string[]>([]);
  savingTags = signal(false);

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
  private placeSearch$ = new Subject<string>();
  private placeCoords$ = new Subject<{ lat: number; lon: number }>();
  private productSearch$ = new Subject<string>();
  private medicineSearch$ = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listService: ListService,
    private itemService: ItemService,
    private itemTypeService: ItemTypeService,
    private bookService: BookService,
    private tvdbService: TvdbService,
    private musicBrainzService: MusicBrainzService,
    private placeService: PlaceService,
    private europeanaService: EuropeanaService,
    private openFoodFactsService: OpenFoodFactsService,
    private bggService: BggService,
    private igdbService: IgdbService,
    private wikivoyageService: WikivoyageService,
    private seatgeekService: SeatGeekService,
    private medicineService: MedicineService,
    private plantService: PlantService,
    private fb: FormBuilder,
    private toastr: NbToastrService,
    private auth: AuthService,
    private confirmDialog: ConfirmDialogService
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
      event_date: [''],
      event_time: [''],
      location_address: [''],
      location_latitude: [''],
      location_longitude: [''],
    });
    this.suggestForm = this.fb.group({
      description: ['', [Validators.required, Validators.maxLength(500)]],
      action: ['add', Validators.required],
      item_text: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadList(id);

    this.itemTypesLoading.set(true);
    this.itemTypeService.getAllItemTypes().subscribe({
      next: types => {
        this.itemTypes.set(types);
        this.itemTypesLoading.set(false);
      },
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

    this.placeSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.placeSearchLoading.set(true);
        return this.placeService.search(q).pipe(
          catchError(() => {
            this.placeSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.placeResults.set(results);
      this.placeSearchLoading.set(false);
    });

    this.placeCoords$.pipe(
      debounceTime(500),
      switchMap(({ lat, lon }) => {
        this.placeReverseLoading.set(true);
        return this.placeService.reverse(lat, lon).pipe(
          catchError(() => {
            this.placeReverseLoading.set(false);
            return of(null);
          })
        );
      })
    ).subscribe(result => {
      this.placeReverseResult.set(result);
      this.placeReverseLoading.set(false);
    });


    this.productSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.productSearchLoading.set(true);
        return this.openFoodFactsService.search(q, this.productDomain()).pipe(
          catchError(() => {
            this.productSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.productResults.set(results);
      this.productSearchLoading.set(false);
    });



    this.medicineSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.medicineSearchLoading.set(true);
        return this.medicineService.search(q).pipe(
          catchError(() => {
            this.medicineSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.medicineResults.set(results);
      this.medicineSearchLoading.set(false);
    });

  }

  ngOnDestroy(): void {
    this.bookSearch$.complete();
    this.tvdbSearch$.complete();
    this.placeSearch$.complete();
    this.placeCoords$.complete();
    this.productSearch$.complete();
    this.medicineSearch$.complete();
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
    this.editItemForm.setValue({
      text: item.text,
      new_child_list_title: '',
      new_child_list_visibility: 'public',
      event_date: item.event_date ?? '',
      event_time: item.event_time ?? '',
      location_address: item.location_address ?? '',
      location_latitude: item.location_latitude ?? '',
      location_longitude: item.location_longitude ?? '',
    });
  }

  saveEditItem(): void {
    const item = this.editingItem();
    if (!item || this.editItemForm.invalid) return;
    const listId = this.list()!.id;

    const {
      text, new_child_list_title, new_child_list_visibility,
      event_date, event_time, location_address, location_latitude, location_longitude,
    } = this.editItemForm.value;
    const payload: Record<string, unknown> = {
      text,
      event_date: event_date?.trim() ? event_date : null,
      event_time: event_time?.trim() ? event_time : null,
      location_address: location_address?.trim() ?? '',
      location_latitude: location_latitude?.toString().trim() ? location_latitude : null,
      location_longitude: location_longitude?.toString().trim() ? location_longitude : null,
    };
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
    this.confirmDialog.confirm({
      title: 'Elimina elemento',
      message: 'Eliminare questo elemento?',
      confirmLabel: 'Elimina',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      const listId = this.list()!.id;
      this.itemService.deleteItem(listId, item.id).subscribe({
        next: () => {
          this.items.update(items => items.filter(i => i.id !== item.id));
          this.list.update(l => l ? { ...l, items_count: Math.max(0, l.items_count - 1) } : l);
          this.toastr.success('Elemento eliminato.', 'Eliminato');
        },
        error: () => this.toastr.danger('Impossibile eliminare l\'elemento.', 'Errore')
      });
    });
  }

  // ── Copia elemento in un'altra lista ────────────────────────────────────────────

  openCopyPanel(item: Item): void {
    this.copySourceItem.set(item);
    this.copySelectedListId.set('');
    this.copyDestinations.set([]);
    this.copyDestinationsLoading.set(true);
    const currentListId = this.list()!.id;
    const userId = this.auth.currentUser()?.id;
    this.listService.getLists().subscribe({
      next: resp => {
        const mine = resp.results.filter(l => l.owner.id === userId && l.id !== currentListId);
        this.copyDestinations.set(mine);
        this.copyDestinationsLoading.set(false);
      },
      error: () => this.copyDestinationsLoading.set(false)
    });
  }

  closeCopyPanel(): void {
    this.copySourceItem.set(null);
    this.copyDestinations.set([]);
    this.copySelectedListId.set('');
  }

  onCopyDestinationChange(event: Event): void {
    this.copySelectedListId.set((event.target as HTMLSelectElement).value);
  }

  confirmCopy(): void {
    const item = this.copySourceItem();
    const targetListId = this.copySelectedListId();
    if (!item || !targetListId) return;
    const sourceListId = this.list()!.id;
    this.copyLoading.set(true);
    this.itemService.copyItem(sourceListId, item.id, targetListId).subscribe({
      next: () => {
        this.copyLoading.set(false);
        this.toastr.success(`"${item.text}" copiato nella lista scelta.`, 'Copiato');
        this.closeCopyPanel();
      },
      error: () => {
        this.copyLoading.set(false);
        this.toastr.danger('Impossibile copiare l\'elemento: verifica di avere accesso in modifica alla lista di destinazione.', 'Errore');
      }
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
    this.confirmDialog.confirm({
      title: 'Importa modifiche',
      message: 'Importare le modifiche dalla lista originale? Gli elementi aggiunti alla fonte verranno aggiunti e quelli rimossi verranno eliminati.',
      confirmLabel: 'Importa',
    }).subscribe(confirmed => {
      if (!confirmed) return;
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
    const { description, action, item_text } = this.suggestForm.value;
    this.listService.createSuggestion(
      this.list()!.id,
      description,
      [{ action_type: action, text: item_text }]
    ).subscribe({
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
    const list = this.list();
    if (!list) return;
    const message = prompt('Motivo della segnalazione:');
    if (!message?.trim()) return;
    this.listService.reportList(list.id, list.owner.id, message.trim()).subscribe({
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

  // ── Condivisione ──────────────────────────────────────────────────────────────

  toggleSharePanel(): void {
    this.showSharePanel.update(v => !v);
  }

  // ── Add item panel flow ────────────────────────────────────────────────────────

  openAddPanel(): void {
    this.showTypePicker.set(true);
    this.showAddItem.set(false);
    this.showBookSearch.set(false);
    this.showTvdbSearch.set(false);
    this.showMusicSearch.set(false);
    this.showPlaceSearch.set(false);
    this.showEuropeanaSearch.set(false);
    this.showProductSearch.set(false);
    this.showBggSearch.set(false);
    this.showVideoGameSearch.set(false);
    this.showTravelSearch.set(false);
    this.showConcertSearch.set(false);
    this.showMedicineSearch.set(false);
    this.showPlantSearch.set(false);
    this.showImagePanel.set(false);
    this.showEditions.set(false);
    this.showNewChildList.set(false);
  }

  private readonly productDomains: Record<string, OpenFoodFactsDomain> = {
    food_product: 'food',
    beauty_product: 'beauty',
    other_product: 'product',
  };

  productDomain(): OpenFoodFactsDomain {
    return this.productDomains[this.selectedType()?.name ?? ''] ?? 'product';
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
      this.tvdbType.set(type.name === 'episode' ? 'series' : type.name);
    } else if (['artist', 'album', 'track'].includes(type.name)) {
      this.showMusicSearch.set(true);
    } else if (['board_game', 'rpg'].includes(type.name)) {
      this.showBggSearch.set(true);
    } else if (type.name === 'video_game') {
      this.showVideoGameSearch.set(true);
    } else if (type.name === 'travel_destination') {
      this.showTravelSearch.set(true);
    } else if (type.name === 'concert') {
      this.showConcertSearch.set(true);
    } else if (type.name === 'medicine') {
      this.showMedicineSearch.set(true);
      this.medicineResults.set([]);
      this.medicineQuery.set('');
    } else if (type.name === 'plant') {
      this.showPlantSearch.set(true);
    } else if (type.name === 'place') {
      this.showPlaceSearch.set(true);
      this.placeResults.set([]);
      this.placeQuery.set('');
      this.resetPlaceManualState();
    } else if (['artwork', 'art_artist'].includes(type.name)) {
      this.showEuropeanaSearch.set(true);
    } else if (['food_product', 'beauty_product', 'other_product'].includes(type.name)) {
      this.showProductSearch.set(true);
      this.productResults.set([]);
      this.productQuery.set('');
      this.resetProductBarcodeState();
    } else if (type.name === 'image') {
      this.showImagePanel.set(true);
      this.pendingImageCaption.set('');
      this.pendingImageFile.set(null);
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
      text: 'text-outline',
      artist: 'mic-outline',
      album: 'headphones-outline',
      track: 'music-outline',
      place: 'pin-outline',
      artwork: 'color-palette-outline',
      art_artist: 'brush-outline',
      food_product: 'shopping-bag-outline',
      beauty_product: 'star-outline',
      other_product: 'cube-outline',
      board_game: 'grid-outline',
      rpg: 'book-open-outline',
      video_game: 'monitor-outline',
      travel_destination: 'compass-outline',
      concert: 'music-outline',
      medicine: 'activity-outline',
      plant: 'droplet-outline',
    };
    return icons[name] ?? 'list-outline';
  }

  // Il backend valorizza `icon` con nomi generici (es. "mic", "disc", "map-pin") non presenti
  // nel pacchetto Eva Icons usato dal frontend, che richiede il suffisso "-outline".
  private readonly iconNameFixes: Record<string, string> = {
    mic: 'mic-outline',
    disc: 'headphones-outline',
    music: 'music-outline',
    'map-pin': 'pin-outline',
    palette: 'color-palette-outline',
    brush: 'brush-outline',
    utensils: 'shopping-bag-outline',
    sparkles: 'star-outline',
    package: 'cube-outline',
    dice: 'grid-outline',
    'book-open': 'book-open-outline',
    'gamepad-2': 'monitor-outline',
    compass: 'compass-outline',
    pill: 'activity-outline',
    'flower-2': 'droplet-outline',
  };

  pickIcon(type: ItemType): string {
    const icon = type.icon ? (this.iconNameFixes[type.icon] ?? type.icon) : undefined;
    return icon || this.getDefaultIcon(type.name);
  }

  // Il backend valorizza `label` sempre in inglese (es. "Board Game"); l'interfaccia è in italiano.
  private readonly typeLabelTranslations: Record<string, string> = {
    text: 'Testo',
    link: 'Link',
    book: 'Libro',
    board_game: 'Gioco da tavolo',
    rpg: 'Gioco di ruolo',
    movie: 'Film',
    series: 'Serie TV',
    episode: 'Episodio',
    image: 'Immagine',
    artist: 'Artista',
    album: 'Album',
    track: 'Brano',
    artwork: "Opera d'arte",
    art_artist: "Artista (arte)",
    place: 'Luogo',
    food_product: 'Prodotto alimentare',
    beauty_product: 'Prodotto di bellezza',
    other_product: 'Altro prodotto',
    video_game: 'Videogioco',
    travel_destination: 'Destinazione di viaggio',
    concert: 'Concerto',
    medicine: 'Farmaco',
    plant: 'Pianta',
  };

  typeLabel(type: { name: string; label: string } | null | undefined): string {
    if (!type) return '';
    return this.typeLabelTranslations[type.name] ?? type.label;
  }

  backToTypePicker(): void {
    this.selectedType.set(null);
    this.showAddItem.set(false);
    this.showBookSearch.set(false);
    this.showTvdbSearch.set(false);
    this.showMusicSearch.set(false);
    this.showPlaceSearch.set(false);
    this.showEuropeanaSearch.set(false);
    this.showProductSearch.set(false);
    this.showBggSearch.set(false);
    this.showVideoGameSearch.set(false);
    this.showTravelSearch.set(false);
    this.showConcertSearch.set(false);
    this.showImagePanel.set(false);
    this.showEpisodePicker.set(false);
    this.showEditions.set(false);
    this.bookResults.set([]);
    this.bookQuery.set('');
    this.tvdbResults.set([]);
    this.tvdbQuery.set('');
    this.placeResults.set([]);
    this.placeQuery.set('');
    this.resetPlaceManualState();
    this.productResults.set([]);
    this.productQuery.set('');
    this.resetProductBarcodeState();
    this.medicineResults.set([]);
    this.medicineQuery.set('');
    this.episodesPage.set(null);
    this.episodeSeasonFilter.set(null);
    this.episodeSeriesId.set(null);
    this.showNewChildList.set(false);
    this.pendingImageCaption.set('');
    this.pendingImageFile.set(null);
    const prev1 = this.pendingImagePreviewUrl();
    if (prev1) URL.revokeObjectURL(prev1);
    this.pendingImagePreviewUrl.set(null);
    this.showTypePicker.set(true);
  }

  closeAddPanel(): void {
    this.selectedType.set(null);
    this.showTypePicker.set(false);
    this.showAddItem.set(false);
    this.showBookSearch.set(false);
    this.showTvdbSearch.set(false);
    this.showMusicSearch.set(false);
    this.showPlaceSearch.set(false);
    this.showEuropeanaSearch.set(false);
    this.showProductSearch.set(false);
    this.showBggSearch.set(false);
    this.showVideoGameSearch.set(false);
    this.showTravelSearch.set(false);
    this.showConcertSearch.set(false);
    this.showImagePanel.set(false);
    this.showEpisodePicker.set(false);
    this.showEditions.set(false);
    this.bookResults.set([]);
    this.bookQuery.set('');
    this.tvdbResults.set([]);
    this.tvdbQuery.set('');
    this.placeResults.set([]);
    this.placeQuery.set('');
    this.resetPlaceManualState();
    this.medicineResults.set([]);
    this.medicineQuery.set('');
    this.episodesPage.set(null);
    this.episodeSeasonFilter.set(null);
    this.pendingImageCaption.set('');
    this.pendingImageFile.set(null);
    const prev2 = this.pendingImagePreviewUrl();
    if (prev2) URL.revokeObjectURL(prev2);
    this.pendingImagePreviewUrl.set(null);
    this.episodeSeriesId.set(null);
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
    const meta = book.metadata;

    this.itemService.addItem(listId, {
      text: book.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        author: meta.author,
        isbn: meta.isbn,
        cover_url: meta.cover_url || book.image_url || undefined,
        open_library_key: meta.open_library_key,
        year: meta.year,
        service_url: meta.service_url || book.service_url || undefined,
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

  deleteChildList(item: Item): void {
    const detail = item.child_list_detail;
    if (!detail) return;
    this.confirmDialog.confirm({
      title: 'Elimina sotto-lista',
      message: `Eliminare definitivamente la sotto-lista "${detail.title}"? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina',
      danger: true,
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.listService.deleteList(detail.id).subscribe({
        next: () => {
          this.items.update(items => items.map(i =>
            i.id === item.id ? { ...i, child_list: null, child_list_detail: null } : i
          ));
          this.toastr.success('Sotto-lista eliminata.', 'Eliminata');
        },
        error: () => this.toastr.danger('Impossibile eliminare la sotto-lista (solo il proprietario può farlo).', 'Errore')
      });
    });
  }

  // ── Book editions ─────────────────────────────────────────────────────────────

  openEditions(book: BookResult): void {
    this.editionsBook.set(book);
    this.showEditions.set(true);
    this.editions.set([]);
    this.editionsLoading.set(true);
    this.bookService.getEditions(book.metadata.open_library_key).subscribe({
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
    const bookMeta = book.metadata;

    this.itemService.addItem(listId, {
      text: title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        author: bookMeta.author,
        isbn: edition.isbn || bookMeta.isbn,
        cover_url: edition.cover_url || bookMeta.cover_url || book.image_url || undefined,
        open_library_key: bookMeta.open_library_key,
        year: edition.year ?? bookMeta.year,
        service_url: edition.service_url || bookMeta.service_url || book.service_url || undefined,
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

  selectSeriesForEpisodes(result: TvdbSearchResult): void {
    const id = parseInt(result.metadata.thetvdb_id, 10);
    if (!id) return;
    this.episodeSeriesId.set(id);
    this.episodeSeriesName.set(result.title);
    this.showTvdbSearch.set(false);
    this.showEpisodePicker.set(true);
    this.episodesLoading.set(true);
    this.episodeSeasonFilter.set(null);
    this.tvdbService.getSeriesEpisodes(id, undefined, 0, this.tvdbLanguage()).subscribe({
      next: page => {
        this.episodesPage.set(page);
        this.episodesLoading.set(false);
        const seasons = [...new Set(page.episodes.map(e => e.season_number))].sort((a, b) => a - b);
        if (seasons.length > 0) this.episodeSeasonFilter.set(seasons[0]);
      },
      error: () => { this.episodesLoading.set(false); }
    });
  }

  episodeSeasons(): number[] {
    const page = this.episodesPage();
    if (!page) return [];
    return [...new Set(page.episodes.map(e => e.season_number))].sort((a, b) => a - b);
  }

  filteredEpisodes(): TvdbEpisode[] {
    const page = this.episodesPage();
    if (!page) return [];
    const season = this.episodeSeasonFilter();
    if (season === null) return page.episodes;
    return page.episodes.filter(e => e.season_number === season);
  }

  addEpisodeItem(episode: TvdbEpisode): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.itemTypes().find(t => t.name === 'episode')?.id ?? null;
    // TheTVDB restituisce `name: null` per gli episodi privi di traduzione nella lingua richiesta
    // (tipico per gli "special"/season 0): senza fallback il backend rifiuta `text: null`.
    const text = episode.name || `${this.episodeSeriesName()} ${episode.season_number}×${episode.episode_number}`;
    this.itemService.addItem(listId, {
      text,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        thetvdb_id: String(episode.tvdb_id),
        type: 'episode',
        series_tvdb_id: this.episodeSeriesId() ? String(this.episodeSeriesId()) : undefined,
        series_name: this.episodeSeriesName() || undefined,
        season_number: episode.season_number,
        episode_number: episode.episode_number,
        image_url: episode.image_url || undefined,
        language: this.tvdbLanguage(),
        service_url: episode.service_url || undefined,
        aired: episode.aired || undefined,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${text}" aggiunto!`, 'Aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere l\'episodio.', 'Errore')
    });
  }

  backToSeriesSearch(): void {
    this.showEpisodePicker.set(false);
    this.episodesPage.set(null);
    this.episodeSeasonFilter.set(null);
    this.episodeSeriesId.set(null);
    this.tvdbResults.set([]);
    this.tvdbQuery.set('');
    this.showTvdbSearch.set(true);
  }

  addTvdbItem(result: TvdbSearchResult): void {
    if (this.selectedType()?.name === 'episode' && result.metadata.type !== 'episode') {
      this.selectSeriesForEpisodes(result);
      return;
    }

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

  // ── MusicBrainz search ───────────────────────────────────────────────────────

  musicSearch = (query: string) => {
    const type = (this.selectedType()?.name as MusicBrainzEntityType) ?? 'artist';
    return this.musicBrainzService.search(query, type);
  };

  musicSearchTitle(): string {
    const name = this.selectedType()?.name;
    if (name === 'artist') return 'Cerca artista su MusicBrainz';
    if (name === 'track') return 'Cerca brano su MusicBrainz';
    return 'Cerca album su MusicBrainz';
  }

  musicSearchPlaceholder(): string {
    const name = this.selectedType()?.name;
    if (name === 'artist') return 'Nome artista...';
    if (name === 'track') return 'Titolo del brano...';
    return "Titolo dell'album...";
  }

  musicSearchIcon(): string {
    const name = this.selectedType()?.name;
    if (name === 'artist') return 'mic-outline';
    if (name === 'track') return 'music-outline';
    return 'recording-outline';
  }

  addMusicItem(result: MusicBrainzSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        ...result.metadata,
        image_url: (result.metadata['image_url'] as string | undefined) ?? result.image_url ?? undefined,
        service_url: (result.metadata['service_url'] as string | undefined) ?? result.service_url ?? undefined,
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

  musicIcon(item: Item): string {
    const name = item.item_type_detail?.name;
    if (name === 'artist') return 'mic-outline';
    if (name === 'track') return 'music-outline';
    return 'recording-outline';
  }

  isBookItem(item: Item): boolean {
    return !!(item.metadata?.['cover_url'] || item.metadata?.['author'] || item.item_type_detail?.name === 'book');
  }

  isTvdbItem(item: Item): boolean {
    const name = item.item_type_detail?.name;
    return name === 'series' || name === 'movie' || name === 'episode';
  }

  isMusicItem(item: Item): boolean {
    const name = item.item_type_detail?.name;
    return name === 'artist' || name === 'album' || name === 'track';
  }

  // ── Place search (Nominatim) ────────────────────────────────────────────────

  onPlaceQueryChange(q: string): void {
    this.placeQuery.set(q);
    if (q.trim().length < 2) {
      this.placeResults.set([]);
      this.placeSearchLoading.set(false);
      return;
    }
    this.placeSearch$.next(q.trim());
  }

  addPlaceItem(result: PlaceSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'place')?.id ?? null;
    const meta = result.metadata;

    this.itemService.addItem(listId, {
      text: result.title || meta.display_name,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        display_name: meta.display_name,
        address: meta.address,
        latitude: meta.latitude,
        longitude: meta.longitude,
        osm_id: meta.osm_id,
        osm_type: meta.osm_type,
        place_id: meta.place_id,
        category: meta.category,
        place_type: meta.place_type,
        service_url: meta.service_url || result.service_url || undefined,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${item.text}" aggiunto!`, 'Luogo aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere il luogo.', 'Errore')
    });
  }

  togglePlaceManualMode(): void {
    this.placeManualMode.update(v => !v);
    this.placeReverseResult.set(null);
  }

  onPlaceMapPositionChange(pos: { lat: number; lon: number }): void {
    this.placePickedLat.set(pos.lat);
    this.placePickedLon.set(pos.lon);
    this.placeReverseResult.set(null);
    this.placeCoords$.next(pos);
  }

  onPlaceManualCoordChange(): void {
    const lat = this.placePickedLat();
    const lon = this.placePickedLon();
    if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return;
    this.placeReverseResult.set(null);
    this.placeCoords$.next({ lat, lon });
  }

  onPlaceLatInput(value: string): void {
    const lat = value.trim() === '' ? null : parseFloat(value);
    this.placePickedLat.set(lat != null && !Number.isNaN(lat) ? lat : null);
    this.onPlaceManualCoordChange();
  }

  onPlaceLonInput(value: string): void {
    const lon = value.trim() === '' ? null : parseFloat(value);
    this.placePickedLon.set(lon != null && !Number.isNaN(lon) ? lon : null);
    this.onPlaceManualCoordChange();
  }

  private resetPlaceManualState(): void {
    this.placeManualMode.set(false);
    this.placePickedLat.set(null);
    this.placePickedLon.set(null);
    this.placeReverseResult.set(null);
    this.placeReverseLoading.set(false);
  }

  // ── Europeana search ─────────────────────────────────────────────────────────

  europeanaSearch = (query: string) => {
    const type: EuropeanaEntityType = this.selectedType()?.name === 'art_artist' ? 'artist' : 'artwork';
    return this.europeanaService.search(query, type);
  };

  europeanaSearchTitle(): string {
    return this.selectedType()?.name === 'art_artist' ? 'Cerca artista su Europeana' : "Cerca opera d'arte su Europeana";
  }

  europeanaSearchIcon(): string {
    return this.selectedType()?.name === 'art_artist' ? 'brush-outline' : 'color-palette-outline';
  }

  europeanaSearchPlaceholder(): string {
    return this.selectedType()?.name === 'art_artist' ? 'Nome artista...' : 'Titolo, soggetto...';
  }

  addEuropeanaItem(result: EuropeanaSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        ...result.metadata,
        image_url: (result.metadata['image_url'] as string | undefined) ?? result.image_url ?? undefined,
        service_url: (result.metadata['service_url'] as string | undefined) ?? result.service_url ?? undefined,
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

  isEuropeanaItem(item: Item): boolean {
    const name = item.item_type_detail?.name;
    return name === 'artwork' || name === 'art_artist';
  }

  europeanaMeta(item: Item): {
    image_url?: string;
    creator?: string;
    description?: string;
    year?: string;
    medium?: string;
    provider?: string;
    biography?: string;
    date_of_birth?: string;
    date_of_death?: string;
    place_of_birth?: string;
    place_of_death?: string;
    professions?: string[];
    service_url?: string;
  } {
    return (item.metadata ?? {}) as {
      image_url?: string;
      creator?: string;
      description?: string;
      year?: string;
      medium?: string;
      provider?: string;
      biography?: string;
      date_of_birth?: string;
      date_of_death?: string;
      place_of_birth?: string;
      place_of_death?: string;
      professions?: string[];
      service_url?: string;
    };
  }

  europeanaIcon(item: Item): string {
    return item.item_type_detail?.name === 'art_artist' ? 'brush-outline' : 'color-palette-outline';
  }

  europeanaMetaLine(item: Item): string {
    const meta = this.europeanaMeta(item);
    const parts: string[] = [];
    if (meta.creator) parts.push(meta.creator);
    if (meta.year) parts.push(`· ${meta.year}`);
    return parts.join(' ');
  }

  europeanaDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.europeanaMeta(item);
    const rows: ItemDetailRow[] = [];
    if (item.item_type_detail) {
      rows.push({ icon: this.europeanaIcon(item), text: this.typeLabel(item.item_type_detail) });
    }
    if (item.item_type_detail?.name === 'art_artist') {
      if (meta.biography) rows.push({ icon: 'file-text-outline', text: meta.biography });
      if (meta.date_of_birth || meta.date_of_death) {
        const text = meta.date_of_death ? `${meta.date_of_birth ?? ''} – ${meta.date_of_death}` : (meta.date_of_birth ?? '');
        rows.push({ icon: 'calendar-outline', text });
      }
      if (meta.place_of_birth) rows.push({ icon: 'pin-outline', text: meta.place_of_birth });
      if (meta.professions?.length) rows.push({ icon: 'briefcase-outline', text: meta.professions.join(', ') });
    } else {
      if (meta.creator) rows.push({ icon: 'person-outline', text: meta.creator });
      if (meta.year) rows.push({ icon: 'calendar-outline', text: meta.year });
      if (meta.medium) rows.push({ icon: 'brush-outline', text: meta.medium });
      if (meta.description) rows.push({ icon: 'file-text-outline', text: meta.description });
      if (meta.provider) rows.push({ icon: 'briefcase-outline', text: meta.provider });
    }
    return rows;
  }

  europeanaExternalLink(item: Item): ItemDetailLink | null {
    const url = this.europeanaMeta(item).service_url;
    return url ? { url, label: 'Apri su Europeana' } : null;
  }

  // ── BoardGameGeek search ──────────────────────────────────────────────────────

  bggSearch = (query: string) => {
    const type: BGGSearchType = this.selectedType()?.name === 'rpg' ? 'rpgitem' : 'boardgame';
    return this.bggService.search(query, type);
  };

  readonly bggAttributionLogo: AttributionLogo = {
    src: '/images/powered-by-bgg.png',
    alt: 'Powered by BGG',
    href: 'https://boardgamegeek.com',
  };

  addBggItem(result: BGGSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? null;
    const bggId = result.metadata.bgg_id;

    const create = (imageUrl: string | undefined) => {
      this.itemService.addItem(listId, {
        text: result.title,
        ...(typeId ? { item_type: typeId } : {}),
        metadata: {
          ...result.metadata,
          image_url: imageUrl,
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
    };

    // La ricerca BGG non include mai un'immagine: va recuperata dal dettaglio del gioco.
    if (bggId) {
      this.bggService.getGame(bggId).subscribe({
        next: detail => create(detail.image_url || detail.thumbnail_url || undefined),
        error: () => create(undefined),
      });
    } else {
      create(undefined);
    }
  }

  syncBggItem(item: Item): void {
    const bggId = this.bggMeta(item).bgg_id;
    if (!bggId) return;
    const listId = this.list()!.id;
    this.syncingItemId.set(item.id);

    this.bggService.getGame(bggId).subscribe({
      next: detail => {
        this.itemService.updateItem(listId, item.id, {
          metadata: {
            ...item.metadata,
            image_url: detail.image_url || detail.thumbnail_url || undefined,
          },
        } as Partial<Item>).subscribe({
          next: updated => {
            this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
            this.syncingItemId.set(null);
            this.toastr.success('Dati aggiornati da BoardGameGeek.', 'Sincronizzato');
          },
          error: () => {
            this.syncingItemId.set(null);
            this.toastr.danger('Impossibile sincronizzare.', 'Errore');
          }
        });
      },
      error: () => {
        this.syncingItemId.set(null);
        this.toastr.danger('Impossibile sincronizzare.', 'Errore');
      }
    });
  }

  isBggItem(item: Item): boolean {
    const name = item.item_type_detail?.name;
    return name === 'board_game' || name === 'rpg';
  }

  bggIcon(item: Item): string {
    return item.item_type_detail?.name === 'rpg' ? 'book-open-outline' : 'shuffle-outline';
  }

  bggMeta(item: Item): {
    bgg_id?: number;
    year_published?: number;
    service_url?: string;
    image_url?: string;
  } {
    return (item.metadata ?? {}) as {
      bgg_id?: number;
      year_published?: number;
      service_url?: string;
      image_url?: string;
    };
  }

  bggMetaLine(item: Item): string {
    const year = this.bggMeta(item).year_published;
    return year ? String(year) : '';
  }

  bggDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.bggMeta(item);
    const rows: ItemDetailRow[] = [];
    if (item.item_type_detail) {
      rows.push({ icon: this.bggIcon(item), text: this.typeLabel(item.item_type_detail) });
    }
    if (meta.year_published) {
      rows.push({ icon: 'calendar-outline', text: String(meta.year_published) });
    }
    return rows;
  }

  bggExternalLink(item: Item): ItemDetailLink | null {
    const url = this.bggMeta(item).service_url;
    return url ? { url, label: 'Apri su BoardGameGeek' } : null;
  }

  // ── IGDB search (video_game) ──────────────────────────────────────────────────

  videoGameSearch = (query: string) => this.igdbService.search(query);

  addVideoGameItem(result: IGDBSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'video_game')?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        ...result.metadata,
        image_url: (result.metadata['image_url'] as string | undefined) ?? result.image_url ?? undefined,
        service_url: (result.metadata['service_url'] as string | undefined) ?? result.service_url ?? undefined,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${result.title}" aggiunto!`, 'Videogioco aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere il videogioco.', 'Errore')
    });
  }

  // La ricerca IGDB restituisce solo dati minimali (piattaforme, generi, anno); il
  // dettaglio esteso (trama, screenshot, sviluppatori, editori, voto) è disponibile
  // solo su GET /igdb/games/{id}/, richiamato qui per arricchire l'elemento già aggiunto.
  syncVideoGameItem(item: Item): void {
    const igdbId = this.videoGameMeta(item).igdb_id;
    if (!igdbId) return;
    const listId = this.list()!.id;
    this.syncingItemId.set(item.id);

    this.igdbService.getGame(igdbId).subscribe({
      next: detail => {
        this.itemService.updateItem(listId, item.id, {
          metadata: {
            ...item.metadata,
            ...detail,
          },
        } as Partial<Item>).subscribe({
          next: updated => {
            this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
            this.syncingItemId.set(null);
            this.toastr.success('Dati aggiornati da IGDB.', 'Sincronizzato');
          },
          error: () => {
            this.syncingItemId.set(null);
            this.toastr.danger('Impossibile sincronizzare.', 'Errore');
          }
        });
      },
      error: () => {
        this.syncingItemId.set(null);
        this.toastr.danger('Impossibile sincronizzare.', 'Errore');
      }
    });
  }

  isVideoGameItem(item: Item): boolean {
    return item.item_type_detail?.name === 'video_game';
  }

  videoGameMeta(item: Item): {
    igdb_id?: number;
    slug?: string;
    platforms?: string[];
    genres?: string[];
    first_release_date?: string;
    image_url?: string;
    service_url?: string;
    summary?: string;
    storyline?: string;
    screenshots?: string[];
    game_modes?: string[];
    themes?: string[];
    developers?: string[];
    publishers?: string[];
    rating?: number;
    aggregated_rating?: number;
  } {
    return (item.metadata ?? {}) as {
      igdb_id?: number;
      slug?: string;
      platforms?: string[];
      genres?: string[];
      first_release_date?: string;
      image_url?: string;
      service_url?: string;
      summary?: string;
      storyline?: string;
      screenshots?: string[];
      game_modes?: string[];
      themes?: string[];
      developers?: string[];
      publishers?: string[];
      rating?: number;
      aggregated_rating?: number;
    };
  }

  videoGameMetaLine(item: Item): string {
    const meta = this.videoGameMeta(item);
    const platforms = meta.platforms?.length ? meta.platforms.slice(0, 2).join(', ') : '';
    const year = meta.first_release_date ? `· ${meta.first_release_date.slice(0, 4)}` : '';
    return [platforms, year].filter(Boolean).join(' ');
  }

  videoGameDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.videoGameMeta(item);
    const rows: ItemDetailRow[] = [];
    if (item.item_type_detail) {
      rows.push({ icon: 'monitor-outline', text: this.typeLabel(item.item_type_detail) });
    }
    if (meta.platforms?.length) {
      rows.push({ icon: 'hard-drive-outline', text: meta.platforms.join(', ') });
    }
    if (meta.genres?.length) {
      rows.push({ icon: 'pricetags-outline', text: meta.genres.join(', ') });
    }
    if (meta.first_release_date) {
      rows.push({ icon: 'calendar-outline', text: meta.first_release_date });
    }
    if (meta.developers?.length) {
      rows.push({ icon: 'code-outline', text: meta.developers.join(', ') });
    }
    if (meta.publishers?.length) {
      rows.push({ icon: 'briefcase-outline', text: meta.publishers.join(', ') });
    }
    if (meta.rating) {
      rows.push({ icon: 'star-outline', text: `${Math.round(meta.rating)}/100` });
    }
    if (meta.summary) {
      rows.push({ icon: 'file-text-outline', text: meta.summary, wrap: true });
    }
    return rows;
  }

  videoGameExternalLink(item: Item): ItemDetailLink | null {
    const url = this.videoGameMeta(item).service_url;
    return url ? { url, label: 'Apri su IGDB' } : null;
  }

  // ── Wikivoyage search (travel_destination) ────────────────────────────────────

  travelSearch = (query: string) => this.wikivoyageService.search(query, this.travelLanguage());

  onTravelLanguageChange(event: Event, panel: ExternalSearchPanelComponent<WikivoyageSearchResult>): void {
    this.travelLanguage.set((event.target as HTMLSelectElement).value);
    panel.researchCurrentQuery();
  }

  travelMetaLine(item: Item): string {
    const lang = this.travelMeta(item).lang;
    return lang ? lang.toUpperCase() : '';
  }

  addTravelItem(result: WikivoyageSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'travel_destination')?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        ...result.metadata,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${result.title}" aggiunta!`, 'Destinazione aggiunta');
      },
      error: () => this.toastr.danger('Impossibile aggiungere la destinazione.', 'Errore')
    });
  }

  // La ricerca Wikivoyage restituisce solo dati minimali (nessuna immagine); le liste
  // "Da vedere"/"Da fare"/"Dove mangiare" e l'immagine di copertina sono disponibili
  // solo su GET /wikivoyage/guides/{page_id}/, richiamato qui per arricchire l'elemento
  // già aggiunto.
  syncTravelItem(item: Item): void {
    const pageId = this.travelMeta(item).wikivoyage_page_id;
    if (!pageId) return;
    const listId = this.list()!.id;
    this.syncingItemId.set(item.id);

    this.wikivoyageService.getGuide(pageId, this.travelMeta(item).lang || this.travelLanguage()).subscribe({
      next: detail => {
        this.itemService.updateItem(listId, item.id, {
          metadata: {
            ...item.metadata,
            ...detail,
          },
        } as Partial<Item>).subscribe({
          next: updated => {
            this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
            this.syncingItemId.set(null);
            this.toastr.success('Dati aggiornati da Wikivoyage.', 'Sincronizzato');
          },
          error: () => {
            this.syncingItemId.set(null);
            this.toastr.danger('Impossibile sincronizzare.', 'Errore');
          }
        });
      },
      error: () => {
        this.syncingItemId.set(null);
        this.toastr.danger('Impossibile sincronizzare.', 'Errore');
      }
    });
  }

  isTravelItem(item: Item): boolean {
    return item.item_type_detail?.name === 'travel_destination';
  }

  travelMeta(item: Item): {
    wikivoyage_page_id?: number;
    title?: string;
    lang?: string;
    image_url?: string;
    service_url?: string;
    see?: { name: string; description: string; address: string; url: string }[];
    do?: { name: string; description: string; address: string; url: string }[];
    eat?: { name: string; description: string; address: string; url: string }[];
  } {
    return (item.metadata ?? {}) as {
      wikivoyage_page_id?: number;
      title?: string;
      lang?: string;
      image_url?: string;
      service_url?: string;
      see?: { name: string; description: string; address: string; url: string }[];
      do?: { name: string; description: string; address: string; url: string }[];
      eat?: { name: string; description: string; address: string; url: string }[];
    };
  }

  // ── SeatGeek search (concert) ──────────────────────────────────────────────────

  concertSearch = (query: string) => this.seatgeekService.search(query);

  // La ricerca SeatGeek include già un'immagine (foto del performer, quando disponibile),
  // quindi l'elemento viene aggiunto direttamente dal risultato di ricerca, come IGDB.
  // Data/ora/luogo (event_date/event_time/location_*) sono compilati automaticamente dal
  // backend a partire dai metadata del concerto (derive_event_info), senza bisogno di
  // logica aggiuntiva qui.
  addConcertItem(result: SeatGeekSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'concert')?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        ...result.metadata,
        image_url: result.metadata.image_url ?? result.image_url ?? undefined,
        service_url: result.metadata.service_url || result.service_url || undefined,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${result.title}" aggiunto!`, 'Concerto aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere il concerto.', 'Errore')
    });
  }

  // La ricerca SeatGeek non include le statistiche sui prezzi dei biglietti: disponibili
  // solo su GET /seatgeek/events/{id}/, richiamato qui per arricchire l'elemento già aggiunto.
  syncConcertItem(item: Item): void {
    const eventId = this.concertMeta(item).seatgeek_event_id;
    if (!eventId) return;
    const listId = this.list()!.id;
    this.syncingItemId.set(item.id);

    this.seatgeekService.getEvent(eventId).subscribe({
      next: detail => {
        this.itemService.updateItem(listId, item.id, {
          metadata: {
            ...item.metadata,
            ...detail,
          },
        } as Partial<Item>).subscribe({
          next: updated => {
            this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
            this.syncingItemId.set(null);
            this.toastr.success('Dati aggiornati da SeatGeek.', 'Sincronizzato');
          },
          error: () => {
            this.syncingItemId.set(null);
            this.toastr.danger('Impossibile sincronizzare.', 'Errore');
          }
        });
      },
      error: () => {
        this.syncingItemId.set(null);
        this.toastr.danger('Impossibile sincronizzare.', 'Errore');
      }
    });
  }

  isConcertItem(item: Item): boolean {
    return item.item_type_detail?.name === 'concert';
  }

  concertMeta(item: Item): {
    seatgeek_event_id?: number;
    datetime_local?: string;
    venue_name?: string;
    venue_city?: string;
    venue_country?: string;
    performers?: string[];
    image_url?: string;
    service_url?: string;
    low_price?: number;
    average_price?: number;
    high_price?: number;
    listing_count?: number;
  } {
    return (item.metadata ?? {}) as {
      seatgeek_event_id?: number;
      datetime_local?: string;
      venue_name?: string;
      venue_city?: string;
      venue_country?: string;
      performers?: string[];
      image_url?: string;
      service_url?: string;
      low_price?: number;
      average_price?: number;
      high_price?: number;
      listing_count?: number;
    };
  }

  concertMetaLine(item: Item): string {
    const meta = this.concertMeta(item);
    const parts: string[] = [];
    if (meta.venue_name) parts.push(meta.venue_name);
    if (meta.venue_city) parts.push(`· ${meta.venue_city}`);
    return parts.join(' ');
  }

  concertDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.concertMeta(item);
    const rows: ItemDetailRow[] = [];
    if (meta.performers?.length) {
      rows.push({ icon: 'mic-outline', text: meta.performers.join(', ') });
    }
    if (meta.datetime_local) {
      rows.push({ icon: 'calendar-outline', text: meta.datetime_local });
    }
    if (meta.venue_name) {
      let venueText = meta.venue_name;
      if (meta.venue_city) venueText += `, ${meta.venue_city}`;
      if (meta.venue_country) venueText += ` (${meta.venue_country})`;
      rows.push({ icon: 'pin-outline', text: venueText });
    }
    if (meta.low_price || meta.average_price || meta.high_price) {
      const parts: string[] = [];
      if (meta.low_price) parts.push(`da ${meta.low_price}€`);
      if (meta.average_price) parts.push(`· media ${meta.average_price}€`);
      if (meta.high_price) parts.push(`· fino a ${meta.high_price}€`);
      if (meta.listing_count) parts.push(`(${meta.listing_count} annunci)`);
      rows.push({ icon: 'pricetags-outline', text: parts.join(' ') });
    }
    return rows;
  }

  concertExternalLink(item: Item): ItemDetailLink | null {
    const url = this.concertMeta(item).service_url;
    return url ? { url, label: 'Apri su SeatGeek' } : null;
  }

  // ── AIFA search (medicine) ──────────────────────────────────────────────────────

  onMedicineQueryChange(q: string): void {
    this.medicineQuery.set(q);
    if (q.trim().length < 2) {
      this.medicineResults.set([]);
      this.medicineSearchLoading.set(false);
      return;
    }
    this.medicineSearch$.next(q.trim());
  }

  // A differenza degli altri servizi esterni, la ricerca AIFA non è un proxy live: serve
  // un indice locale già pre-caricato, senza immagine né endpoint di dettaglio/sync.
  addMedicineItem(result: MedicineResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'medicine')?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.name,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: { ...result },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${result.name}" aggiunto!`, 'Farmaco aggiunto');
      },
      error: () => this.toastr.danger('Impossibile aggiungere il farmaco.', 'Errore')
    });
  }

  isMedicineItem(item: Item): boolean {
    return item.item_type_detail?.name === 'medicine';
  }

  medicineMeta(item: Item): {
    aic_code?: string;
    active_ingredient?: string;
    atc_code?: string;
    marketing_authorization_holder?: string;
    pharmaceutical_form?: string;
    pack_description?: string;
    prescription_requirement?: string;
  } {
    return (item.metadata ?? {}) as {
      aic_code?: string;
      active_ingredient?: string;
      atc_code?: string;
      marketing_authorization_holder?: string;
      pharmaceutical_form?: string;
      pack_description?: string;
      prescription_requirement?: string;
    };
  }

  medicineMetaLine(item: Item): string {
    const meta = this.medicineMeta(item);
    const parts: string[] = [];
    if (meta.active_ingredient) parts.push(meta.active_ingredient);
    if (meta.pharmaceutical_form) parts.push(`· ${meta.pharmaceutical_form}`);
    return parts.join(' ');
  }

  medicineDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.medicineMeta(item);
    const rows: ItemDetailRow[] = [];
    if (meta.active_ingredient) rows.push({ icon: 'activity-outline', text: meta.active_ingredient });
    if (meta.atc_code) rows.push({ icon: 'hash-outline', text: `ATC ${meta.atc_code}` });
    if (meta.pharmaceutical_form || meta.pack_description) {
      let text = meta.pharmaceutical_form ?? '';
      if (meta.pack_description) text += ` · ${meta.pack_description}`;
      rows.push({ icon: 'cube-outline', text });
    }
    if (meta.marketing_authorization_holder) rows.push({ icon: 'briefcase-outline', text: meta.marketing_authorization_holder });
    if (meta.prescription_requirement) rows.push({ icon: 'alert-triangle-outline', text: meta.prescription_requirement });
    if (meta.aic_code) rows.push({ icon: 'pricetags-outline', text: `AIC ${meta.aic_code}` });
    return rows;
  }

  // ── Perenual search (plant) ─────────────────────────────────────────────────────

  plantSearch = (query: string) => this.plantService.search(query);

  // La ricerca Perenual include già un'immagine (come IGDB), quindi l'elemento viene
  // aggiunto direttamente dal risultato di ricerca senza una chiamata di dettaglio extra.
  addPlantItem(result: PlantSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? this.itemTypes().find(t => t.name === 'plant')?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: {
        ...result.metadata,
        image_url: result.metadata.image_url ?? result.image_url ?? undefined,
      },
      position,
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        this.closeAddPanel();
        this.toastr.success(`"${result.title}" aggiunta!`, 'Pianta aggiunta');
      },
      error: () => this.toastr.danger('Impossibile aggiungere la pianta.', 'Errore')
    });
  }

  // La ricerca Perenual restituisce solo dati minimali (nome, ciclo, esposizione); i dati
  // di cura estesi (famiglia, origine, descrizione, tolleranze, tossicità...) sono
  // disponibili solo su GET /plants/species/{id}/, richiamato qui per arricchire
  // l'elemento già aggiunto.
  syncPlantItem(item: Item): void {
    const speciesId = this.plantMeta(item).perenual_id;
    if (!speciesId) return;
    const listId = this.list()!.id;
    this.syncingItemId.set(item.id);

    this.plantService.getSpecies(speciesId).subscribe({
      next: detail => {
        this.itemService.updateItem(listId, item.id, {
          metadata: {
            ...item.metadata,
            ...detail,
          },
        } as Partial<Item>).subscribe({
          next: updated => {
            this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
            this.syncingItemId.set(null);
            this.toastr.success('Dati aggiornati da Perenual.', 'Sincronizzato');
          },
          error: () => {
            this.syncingItemId.set(null);
            this.toastr.danger('Impossibile sincronizzare.', 'Errore');
          }
        });
      },
      error: () => {
        this.syncingItemId.set(null);
        this.toastr.danger('Impossibile sincronizzare.', 'Errore');
      }
    });
  }

  isPlantItem(item: Item): boolean {
    return item.item_type_detail?.name === 'plant';
  }

  plantMeta(item: Item): {
    perenual_id?: number;
    common_name?: string;
    scientific_name?: string[];
    other_names?: string[];
    family?: string;
    origin?: string[];
    description?: string;
    cycle?: string;
    watering?: string;
    watering_benchmark?: string;
    sunlight?: string[];
    growth_rate?: string;
    maintenance?: string;
    care_level?: string;
    drought_tolerant?: boolean;
    salt_tolerant?: boolean;
    thorny?: boolean;
    invasive?: boolean;
    tropical?: boolean;
    indoor?: boolean;
    edible_fruit?: boolean;
    edible_leaf?: boolean;
    medicinal?: boolean;
    poisonous_to_humans?: boolean;
    poisonous_to_pets?: boolean;
    image_url?: string;
  } {
    return (item.metadata ?? {}) as {
      perenual_id?: number;
      common_name?: string;
      scientific_name?: string[];
      other_names?: string[];
      family?: string;
      origin?: string[];
      description?: string;
      cycle?: string;
      watering?: string;
      watering_benchmark?: string;
      sunlight?: string[];
      growth_rate?: string;
      maintenance?: string;
      care_level?: string;
      drought_tolerant?: boolean;
      salt_tolerant?: boolean;
      thorny?: boolean;
      invasive?: boolean;
      tropical?: boolean;
      indoor?: boolean;
      edible_fruit?: boolean;
      edible_leaf?: boolean;
      medicinal?: boolean;
      poisonous_to_humans?: boolean;
      poisonous_to_pets?: boolean;
      image_url?: string;
    };
  }

  plantMetaLine(item: Item): string {
    const meta = this.plantMeta(item);
    const parts: string[] = [];
    if (meta.scientific_name?.length) parts.push(meta.scientific_name.join(', '));
    if (meta.cycle) parts.push(`· ${meta.cycle}`);
    return parts.join(' ');
  }

  plantDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.plantMeta(item);
    const rows: ItemDetailRow[] = [];
    if (meta.scientific_name?.length) {
      rows.push({ text: meta.scientific_name.join(', '), italic: true });
    }
    if (meta.family) {
      rows.push({ icon: 'pricetags-outline', text: meta.family });
    }
    if (meta.origin?.length) {
      rows.push({ icon: 'pin-outline', text: meta.origin.join(', ') });
    }
    if (meta.description) {
      rows.push({ icon: 'file-text-outline', text: meta.description, wrap: true });
    }
    if (meta.watering || meta.watering_benchmark) {
      let text = meta.watering ?? '';
      if (meta.watering_benchmark) text += ` (${meta.watering_benchmark})`;
      rows.push({ icon: 'droplet-outline', text });
    }
    if (meta.sunlight?.length) {
      rows.push({ icon: 'sun-outline', text: meta.sunlight.join(', ') });
    }
    if (meta.cycle || meta.growth_rate || meta.maintenance || meta.care_level) {
      const parts: string[] = [];
      if (meta.cycle) parts.push(meta.cycle);
      if (meta.growth_rate) parts.push(`· crescita ${meta.growth_rate}`);
      if (meta.maintenance) parts.push(`· manutenzione ${meta.maintenance}`);
      if (meta.care_level) parts.push(`· cura ${meta.care_level}`);
      rows.push({ icon: 'activity-outline', text: parts.join(' ') });
    }
    return rows;
  }

  plantBadges(item: Item): ItemRowBadge[] {
    const meta = this.plantMeta(item);
    const badges: ItemRowBadge[] = [];
    if (meta.indoor) badges.push({ text: 'Da interno' });
    if (meta.tropical) badges.push({ text: 'Tropicale' });
    if (meta.drought_tolerant) badges.push({ text: 'Resistente alla siccità' });
    if (meta.salt_tolerant) badges.push({ text: 'Resistente al sale' });
    if (meta.thorny) badges.push({ text: 'Spinosa' });
    if (meta.invasive) badges.push({ text: 'Invasiva' });
    if (meta.edible_fruit) badges.push({ text: 'Frutto commestibile' });
    if (meta.edible_leaf) badges.push({ text: 'Foglia commestibile' });
    if (meta.medicinal) badges.push({ text: 'Uso medicinale' });
    return badges;
  }

  plantWarningText(item: Item): string | null {
    const meta = this.plantMeta(item);
    if (!meta.poisonous_to_humans && !meta.poisonous_to_pets) return null;
    const targets: string[] = [];
    if (meta.poisonous_to_humans) targets.push("l'uomo");
    if (meta.poisonous_to_pets) targets.push('gli animali domestici');
    return `Tossica per ${targets.join(' e per ')}`;
  }

  // ── Open Food/Beauty/Products Facts search ────────────────────────────────────

  productSearchTitle(): string {
    const name = this.selectedType()?.name;
    if (name === 'food_product') return 'Cerca un prodotto alimentare';
    if (name === 'beauty_product') return 'Cerca un prodotto di bellezza';
    return 'Cerca un prodotto';
  }

  productSearchIcon(): string {
    const name = this.selectedType()?.name;
    if (name === 'food_product') return 'shopping-bag-outline';
    if (name === 'beauty_product') return 'star-outline';
    return 'cube-outline';
  }

  onProductQueryChange(q: string): void {
    this.productQuery.set(q);
    if (q.trim().length < 2) {
      this.productResults.set([]);
      this.productSearchLoading.set(false);
      return;
    }
    this.productSearch$.next(q.trim());
  }

  toggleProductBarcodeMode(): void {
    this.productBarcodeMode.update(v => !v);
    this.productBarcodeResult.set(null);
    this.productBarcodeError.set('');
  }

  onProductBarcodeInput(value: string): void {
    this.productBarcode.set(value);
  }

  lookupProductBarcode(): void {
    const barcode = this.productBarcode().trim();
    if (!barcode) return;
    this.productBarcodeLoading.set(true);
    this.productBarcodeError.set('');
    this.productBarcodeResult.set(null);
    this.openFoodFactsService.fetchByBarcode(barcode, this.productDomain()).subscribe({
      next: result => {
        this.productBarcodeResult.set(result);
        this.productBarcodeLoading.set(false);
      },
      error: () => {
        this.productBarcodeError.set(`Nessun prodotto trovato per il codice "${barcode}".`);
        this.productBarcodeLoading.set(false);
      }
    });
  }

  private resetProductBarcodeState(): void {
    this.productBarcodeMode.set(false);
    this.productBarcode.set('');
    this.productBarcodeResult.set(null);
    this.productBarcodeLoading.set(false);
    this.productBarcodeError.set('');
  }

  addProductItem(result: OpenFoodFactsSearchResult): void {
    const listId = this.list()!.id;
    const position = String(this.items().length + 1);
    const typeId = this.selectedType()?.id ?? null;

    this.itemService.addItem(listId, {
      text: result.title,
      ...(typeId ? { item_type: typeId } : {}),
      metadata: { ...result.metadata } as Record<string, unknown>,
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

  isProductItem(item: Item): boolean {
    const name = item.item_type_detail?.name;
    return name === 'food_product' || name === 'beauty_product' || name === 'other_product';
  }

  productIcon(item: Item): string {
    const name = item.item_type_detail?.name;
    if (name === 'food_product') return 'shopping-bag-outline';
    if (name === 'beauty_product') return 'star-outline';
    return 'cube-outline';
  }

  productMeta(item: Item): {
    barcode?: string;
    brands?: string;
    quantity?: string;
    categories?: string;
    image_url?: string;
    ingredients_text?: string;
    labels?: string[];
    allergens?: string[];
    nutriscore_grade?: string;
    nova_group?: number;
    ecoscore_grade?: string;
    service_url?: string;
  } {
    return (item.metadata ?? {}) as {
      barcode?: string;
      brands?: string;
      quantity?: string;
      categories?: string;
      image_url?: string;
      ingredients_text?: string;
      labels?: string[];
      allergens?: string[];
      nutriscore_grade?: string;
      nova_group?: number;
      ecoscore_grade?: string;
      service_url?: string;
    };
  }

  productMetaLine(item: Item): string {
    const meta = this.productMeta(item);
    const parts: string[] = [];
    if (meta.brands) parts.push(meta.brands);
    if (meta.quantity) parts.push(`· ${meta.quantity}`);
    return parts.join(' ');
  }

  productScoreBadges(item: Item): ItemRowBadge[] {
    const meta = this.productMeta(item);
    const badges: ItemRowBadge[] = [];
    if (meta.nutriscore_grade) {
      badges.push({ text: `Nutri-Score ${meta.nutriscore_grade.toUpperCase()}`, cssClass: `nutri-badge--${meta.nutriscore_grade}` });
    }
    if (meta.nova_group) {
      badges.push({ text: `NOVA ${meta.nova_group}` });
    }
    if (meta.ecoscore_grade) {
      badges.push({ text: `Eco-Score ${meta.ecoscore_grade.toUpperCase()}`, cssClass: `nutri-badge--${meta.ecoscore_grade}` });
    }
    return badges;
  }

  productDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.productMeta(item);
    const rows: ItemDetailRow[] = [];
    if (meta.brands) rows.push({ icon: 'pricetags-outline', text: meta.brands });
    if (meta.quantity) rows.push({ icon: 'cube-outline', text: meta.quantity });
    if (meta.categories) rows.push({ icon: 'grid-outline', text: meta.categories });
    if (meta.barcode) rows.push({ icon: 'hash-outline', text: meta.barcode });
    // Nel markup originale ingredienti/etichette comparivano dopo i badge punteggio;
    // qui restano nello stesso elenco di righe, subito prima dei badge (riordino cosmetico minore).
    if (meta.ingredients_text) rows.push({ icon: 'file-text-outline', text: meta.ingredients_text, wrap: true });
    if (meta.labels?.length) rows.push({ icon: 'pricetags-outline', text: meta.labels.join(', ') });
    return rows;
  }

  productWarningText(item: Item): string | null {
    const allergens = this.productMeta(item).allergens;
    return allergens?.length ? `Allergeni: ${allergens.join(', ')}` : null;
  }

  productExternalLink(item: Item): ItemDetailLink | null {
    const url = this.productMeta(item).service_url;
    return url ? { url, label: 'Apri su Open Food Facts' } : null;
  }

  onImageFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const prev = this.pendingImagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.pendingImageFile.set(file);
    this.pendingImagePreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  addImageItem(): void {
    const listId = this.list()!.id;
    const typeId = this.selectedType()!.id;
    const caption = this.pendingImageCaption().trim() || 'Immagine';
    const file = this.pendingImageFile();
    this.imageAddLoading.set(true);

    this.itemService.addItem(listId, {
      text: caption,
      item_type: typeId,
      position: String(this.items().length + 1),
    }).subscribe({
      next: item => {
        this.items.update(items => [...items, item]);
        this.list.update(l => l ? { ...l, items_count: l.items_count + 1 } : l);
        if (file) {
          this.itemService.uploadItemImage(listId, item.id, file).subscribe({
            next: updated => {
              this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
              this.imageAddLoading.set(false);
              this.closeAddPanel();
              this.toastr.success('Immagine aggiunta!', 'Successo');
            },
            error: () => {
              this.imageAddLoading.set(false);
              this.closeAddPanel();
              this.toastr.warning('Elemento creato ma caricamento immagine fallito.', 'Attenzione');
            }
          });
        } else {
          this.imageAddLoading.set(false);
          this.closeAddPanel();
          this.toastr.success('Elemento immagine aggiunto!', 'Successo');
        }
      },
      error: () => {
        this.imageAddLoading.set(false);
        this.toastr.danger('Impossibile aggiungere l\'elemento.', 'Errore');
      }
    });
  }

  isImageItem(item: Item): boolean {
    return item.item_type_detail?.name === 'image';
  }

  isPlaceItem(item: Item): boolean {
    return item.item_type_detail?.name === 'place';
  }

  // Miniatura statica (singola tile OSM) per l'anteprima nella riga elemento;
  // evita di istanziare una mappa Leaflet interattiva per ogni elemento della lista.
  placeTileUrl(lat: number, lon: number, zoom = 15): string {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  }

  uploadItemImage(item: Item, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const listId = this.list()!.id;
    this.imageUploadingItemId.set(item.id);
    this.itemService.uploadItemImage(listId, item.id, file).subscribe({
      next: updated => {
        this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
        this.imageUploadingItemId.set(null);
        this.toastr.success('Immagine caricata!', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile caricare l\'immagine.', 'Errore');
        this.imageUploadingItemId.set(null);
      }
    });
  }

  removeItemImage(item: Item): void {
    const listId = this.list()!.id;
    this.imageUploadingItemId.set(item.id);
    this.itemService.removeItemImage(listId, item.id).subscribe({
      next: updated => {
        this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
        this.imageUploadingItemId.set(null);
        this.toastr.success('Immagine rimossa!', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile rimuovere l\'immagine.', 'Errore');
        this.imageUploadingItemId.set(null);
      }
    });
  }

  bookMeta(item: Item): { author?: string; isbn?: string; cover_url?: string; year?: number | null; service_url?: string } {
    return (item.metadata ?? {}) as { author?: string; isbn?: string; cover_url?: string; year?: number | null; service_url?: string };
  }

  bookMetaLine(item: Item): string {
    const meta = this.bookMeta(item);
    const parts: string[] = [];
    if (meta.author) parts.push(meta.author);
    if (meta.year) parts.push(`· ${meta.year}`);
    if (meta.isbn) parts.push(`· ISBN ${meta.isbn}`);
    return parts.join(' ');
  }

  bookDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.bookMeta(item);
    const rows: ItemDetailRow[] = [];
    if (meta.author) rows.push({ icon: 'person-outline', text: meta.author });
    if (meta.year) rows.push({ icon: 'calendar-outline', text: String(meta.year) });
    if (meta.isbn) rows.push({ icon: 'hash-outline', text: `ISBN ${meta.isbn}` });
    return rows;
  }

  bookExternalLink(item: Item): ItemDetailLink | null {
    const url = this.bookMeta(item).service_url;
    return url ? { url, label: 'Apri su OpenLibrary' } : null;
  }

  tvdbMeta(item: Item): { image_url?: string; network?: string; status?: string; year?: number; service_url?: string; type?: string } {
    return (item.metadata ?? {}) as { image_url?: string; network?: string; status?: string; year?: number; service_url?: string; type?: string };
  }

  tvdbMetaLine(item: Item): string {
    const meta = this.tvdbMeta(item);
    const parts: string[] = [];
    if (meta.year) parts.push(String(meta.year));
    if (meta.network) parts.push(`· ${meta.network}`);
    if (meta.status) parts.push(`· ${meta.status}`);
    return parts.join(' ');
  }

  tvdbDetailIcon(item: Item): string {
    return item.item_type_detail?.name === 'movie' ? 'film-outline' : 'tv-outline';
  }

  tvdbDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.tvdbMeta(item);
    const rows: ItemDetailRow[] = [];
    if (item.item_type_detail) {
      rows.push({ icon: this.tvdbDetailIcon(item), text: this.typeLabel(item.item_type_detail) });
    }
    if (meta.year) rows.push({ icon: 'calendar-outline', text: String(meta.year) });
    if (meta.network) rows.push({ icon: 'monitor-outline', text: meta.network });
    if (meta.status) rows.push({ icon: 'info-outline', text: meta.status });
    return rows;
  }

  tvdbExternalLink(item: Item): ItemDetailLink | null {
    const url = this.tvdbMeta(item).service_url;
    return url ? { url, label: 'Apri su TheTVDB' } : null;
  }

  musicMeta(item: Item): {
    image_url?: string;
    artist_name?: string;
    album_name?: string;
    first_release_date?: string;
    country?: string;
    life_span_begin?: string;
    life_span_end?: string;
    track_number?: string;
    service_url?: string;
  } {
    return (item.metadata ?? {}) as {
      image_url?: string;
      artist_name?: string;
      album_name?: string;
      first_release_date?: string;
      country?: string;
      life_span_begin?: string;
      life_span_end?: string;
      track_number?: string;
      service_url?: string;
    };
  }

  musicMetaLine(item: Item): string {
    const meta = this.musicMeta(item);
    const parts: string[] = [];
    if (meta.artist_name) parts.push(meta.artist_name);
    if (meta.album_name) parts.push(`· ${meta.album_name}`);
    if (meta.first_release_date) parts.push(`· ${meta.first_release_date}`);
    if (meta.country) parts.push(`· ${meta.country}`);
    return parts.join(' ');
  }

  musicDetailRows(item: Item): ItemDetailRow[] {
    const meta = this.musicMeta(item);
    const rows: ItemDetailRow[] = [];
    if (item.item_type_detail) {
      rows.push({ icon: this.musicIcon(item), text: this.typeLabel(item.item_type_detail) });
    }
    if (meta.artist_name) {
      rows.push({ icon: 'mic-outline', text: meta.artist_name });
    }
    if (meta.album_name) {
      rows.push({ icon: 'recording-outline', text: meta.album_name });
    }
    if (meta.first_release_date) {
      rows.push({ icon: 'calendar-outline', text: meta.first_release_date });
    }
    if (meta.country) {
      rows.push({ icon: 'globe-2-outline', text: meta.country });
    }
    if (meta.life_span_begin) {
      const text = meta.life_span_end ? `${meta.life_span_begin} – ${meta.life_span_end}` : meta.life_span_begin;
      rows.push({ icon: 'calendar-outline', text });
    }
    if (meta.track_number) {
      rows.push({ icon: 'hash-outline', text: `Traccia ${meta.track_number}` });
    }
    return rows;
  }

  musicExternalLink(item: Item): ItemDetailLink | null {
    const url = this.musicMeta(item).service_url;
    return url ? { url, label: 'Apri su MusicBrainz' } : null;
  }

  placeMeta(item: Item): {
    display_name?: string;
    address?: Record<string, string>;
    latitude?: number;
    longitude?: number;
    category?: string;
    place_type?: string;
    service_url?: string;
  } {
    return (item.metadata ?? {}) as {
      display_name?: string;
      address?: Record<string, string>;
      latitude?: number;
      longitude?: number;
      category?: string;
      place_type?: string;
      service_url?: string;
    };
  }

  placeMetaLine(item: Item): string {
    const meta = this.placeMeta(item);
    const parts: string[] = [];
    if (meta.category) parts.push(meta.category);
    if (meta.place_type) parts.push(`· ${meta.place_type}`);
    return parts.join(' ');
  }

  placeRowImageUrl(item: Item): string | null {
    const meta = this.placeMeta(item);
    return meta.latitude != null && meta.longitude != null ? this.placeTileUrl(meta.latitude, meta.longitude) : null;
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

  get hasMusicItems(): boolean {
    return this.items().some(item => this.isMusicItem(item));
  }

  get hasPlaceItems(): boolean {
    return this.items().some(item => this.isPlaceItem(item));
  }

  get hasEuropeanaItems(): boolean {
    return this.items().some(item => this.isEuropeanaItem(item));
  }

  get hasProductItems(): boolean {
    return this.items().some(item => this.isProductItem(item));
  }

  get hasBggItems(): boolean {
    return this.items().some(item => this.isBggItem(item));
  }

  get hasVideoGameItems(): boolean {
    return this.items().some(item => this.isVideoGameItem(item));
  }

  get hasTravelItems(): boolean {
    return this.items().some(item => this.isTravelItem(item));
  }

  get hasConcertItems(): boolean {
    return this.items().some(item => this.isConcertItem(item));
  }

  get hasMedicineItems(): boolean {
    return this.items().some(item => this.isMedicineItem(item));
  }

  get hasPlantItems(): boolean {
    return this.items().some(item => this.isPlantItem(item));
  }

  get hasExternalItems(): boolean {
    return this.hasBookItems || this.hasTvdbItems || this.hasMusicItems || this.hasPlaceItems || this.hasEuropeanaItems || this.hasProductItems || this.hasBggItems || this.hasVideoGameItems || this.hasTravelItems || this.hasConcertItems || this.hasMedicineItems || this.hasPlantItems;
  }

  externalAttributions(): { name: string; url: string }[] {
    const sources: { name: string; url: string; present: boolean }[] = [
      { name: 'OpenLibrary', url: 'https://openlibrary.org', present: this.hasBookItems },
      { name: 'TheTVDB', url: 'https://thetvdb.com', present: this.hasTvdbItems },
      { name: 'MusicBrainz', url: 'https://musicbrainz.org', present: this.hasMusicItems },
      { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', present: this.hasPlaceItems },
      { name: 'Europeana', url: 'https://www.europeana.eu', present: this.hasEuropeanaItems },
      { name: 'Open Food Facts', url: 'https://world.openfoodfacts.org', present: this.hasProductItems },
      { name: 'BoardGameGeek', url: 'https://boardgamegeek.com', present: this.hasBggItems },
      { name: 'IGDB', url: 'https://www.igdb.com', present: this.hasVideoGameItems },
      { name: 'Wikivoyage', url: 'https://www.wikivoyage.org', present: this.hasTravelItems },
      { name: 'SeatGeek', url: 'https://seatgeek.com', present: this.hasConcertItems },
      { name: 'AIFA', url: 'https://www.aifa.gov.it', present: this.hasMedicineItems },
      { name: 'Perenual', url: 'https://perenual.com', present: this.hasPlantItems },
    ];
    return sources.filter(s => s.present).map(({ name, url }) => ({ name, url }));
  }

  get isOwner(): boolean {
    const list = this.list();
    const user = this.auth.currentUser();
    return !!list && !!user && list.owner.id === user.id;
  }

  /**
   * Permesso di modifica sui contenuti (elementi, tag) — vero anche per un
   * utente non proprietario con `my_permission: 'edit'` (condivisione diretta o
   * di gruppo). Distinto da `isOwner`, che resta riservato alle azioni
   * amministrative (condivisione, fork/diff/merge, gestione suggerimenti).
   */
  get canEdit(): boolean {
    return this.list()?.my_permission === 'edit';
  }

  goBack(): void {
    this.router.navigate(['/pages/lists']);
  }

  startEditTags(): void {
    this.pendingTags.set(this.list()!.tags.map(t => t.name));
    this.editingTags.set(true);
  }

  cancelEditTags(): void {
    this.editingTags.set(false);
  }

  saveTags(): void {
    const list = this.list();
    if (!list) return;
    this.savingTags.set(true);
    this.listService.updateList(list.id, { tags: this.pendingTags() }).subscribe({
      next: updated => {
        this.list.set(updated);
        this.editingTags.set(false);
        this.savingTags.set(false);
        this.toastr.success('Tag aggiornati.', 'Successo');
      },
      error: () => {
        this.toastr.danger('Impossibile aggiornare i tag.', 'Errore');
        this.savingTags.set(false);
      }
    });
  }
}
