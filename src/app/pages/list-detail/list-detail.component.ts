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

  // MusicBrainz search
  showMusicSearch = signal(false);
  musicQuery = signal('');
  musicResults = signal<MusicBrainzSearchResult[]>([]);
  musicSearchLoading = signal(false);

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

  // Europeana search
  showEuropeanaSearch = signal(false);
  europeanaQuery = signal('');
  europeanaResults = signal<EuropeanaSearchResult[]>([]);
  europeanaSearchLoading = signal(false);

  // BoardGameGeek search (board_game / rpg)
  showBggSearch = signal(false);
  bggQuery = signal('');
  bggResults = signal<BGGSearchResult[]>([]);
  bggSearchLoading = signal(false);

  // IGDB search (video_game)
  showVideoGameSearch = signal(false);
  videoGameQuery = signal('');
  videoGameResults = signal<IGDBSearchResult[]>([]);
  videoGameSearchLoading = signal(false);

  // Wikivoyage search (travel_destination)
  showTravelSearch = signal(false);
  travelQuery = signal('');
  travelResults = signal<WikivoyageSearchResult[]>([]);
  travelSearchLoading = signal(false);
  travelLanguage = signal('en');

  // SeatGeek search (concert)
  showConcertSearch = signal(false);
  concertQuery = signal('');
  concertResults = signal<SeatGeekSearchResult[]>([]);
  concertSearchLoading = signal(false);

  // AIFA search (medicine)
  showMedicineSearch = signal(false);
  medicineQuery = signal('');
  medicineResults = signal<MedicineResult[]>([]);
  medicineSearchLoading = signal(false);

  // Perenual search (plant)
  showPlantSearch = signal(false);
  plantQuery = signal('');
  plantResults = signal<PlantSearchResult[]>([]);
  plantSearchLoading = signal(false);

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
  private musicSearch$ = new Subject<string>();
  private placeSearch$ = new Subject<string>();
  private placeCoords$ = new Subject<{ lat: number; lon: number }>();
  private europeanaSearch$ = new Subject<string>();
  private productSearch$ = new Subject<string>();
  private bggSearch$ = new Subject<string>();
  private videoGameSearch$ = new Subject<string>();
  private travelSearch$ = new Subject<string>();
  private concertSearch$ = new Subject<string>();
  private medicineSearch$ = new Subject<string>();
  private plantSearch$ = new Subject<string>();

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
    this.itemTypeService.getItemTypes().subscribe({
      next: resp => {
        this.itemTypes.set(resp.results);
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

    this.musicSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.musicSearchLoading.set(true);
        const type = (this.selectedType()?.name as MusicBrainzEntityType) ?? 'artist';
        return this.musicBrainzService.search(q, type).pipe(
          catchError(() => {
            this.musicSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.musicResults.set(results);
      this.musicSearchLoading.set(false);
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

    this.europeanaSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.europeanaSearchLoading.set(true);
        const type: EuropeanaEntityType = this.selectedType()?.name === 'art_artist' ? 'artist' : 'artwork';
        return this.europeanaService.search(q, type).pipe(
          catchError(() => {
            this.europeanaSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.europeanaResults.set(results);
      this.europeanaSearchLoading.set(false);
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

    this.bggSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.bggSearchLoading.set(true);
        const type: BGGSearchType = this.selectedType()?.name === 'rpg' ? 'rpgitem' : 'boardgame';
        return this.bggService.search(q, type).pipe(
          catchError(() => {
            this.bggSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.bggResults.set(results);
      this.bggSearchLoading.set(false);
    });

    this.videoGameSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.videoGameSearchLoading.set(true);
        return this.igdbService.search(q).pipe(
          catchError(() => {
            this.videoGameSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.videoGameResults.set(results);
      this.videoGameSearchLoading.set(false);
    });

    this.travelSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.travelSearchLoading.set(true);
        return this.wikivoyageService.search(q, this.travelLanguage()).pipe(
          catchError(() => {
            this.travelSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.travelResults.set(results);
      this.travelSearchLoading.set(false);
    });

    this.concertSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.concertSearchLoading.set(true);
        return this.seatgeekService.search(q).pipe(
          catchError(() => {
            this.concertSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.concertResults.set(results);
      this.concertSearchLoading.set(false);
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

    this.plantSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.plantSearchLoading.set(true);
        return this.plantService.search(q).pipe(
          catchError(() => {
            this.plantSearchLoading.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.plantResults.set(results);
      this.plantSearchLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.bookSearch$.complete();
    this.tvdbSearch$.complete();
    this.musicSearch$.complete();
    this.placeSearch$.complete();
    this.placeCoords$.complete();
    this.europeanaSearch$.complete();
    this.productSearch$.complete();
    this.bggSearch$.complete();
    this.videoGameSearch$.complete();
    this.travelSearch$.complete();
    this.concertSearch$.complete();
    this.medicineSearch$.complete();
    this.plantSearch$.complete();
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
      this.musicResults.set([]);
      this.musicQuery.set('');
    } else if (['board_game', 'rpg'].includes(type.name)) {
      this.showBggSearch.set(true);
      this.bggResults.set([]);
      this.bggQuery.set('');
    } else if (type.name === 'video_game') {
      this.showVideoGameSearch.set(true);
      this.videoGameResults.set([]);
      this.videoGameQuery.set('');
    } else if (type.name === 'travel_destination') {
      this.showTravelSearch.set(true);
      this.travelResults.set([]);
      this.travelQuery.set('');
    } else if (type.name === 'concert') {
      this.showConcertSearch.set(true);
      this.concertResults.set([]);
      this.concertQuery.set('');
    } else if (type.name === 'medicine') {
      this.showMedicineSearch.set(true);
      this.medicineResults.set([]);
      this.medicineQuery.set('');
    } else if (type.name === 'plant') {
      this.showPlantSearch.set(true);
      this.plantResults.set([]);
      this.plantQuery.set('');
    } else if (type.name === 'place') {
      this.showPlaceSearch.set(true);
      this.placeResults.set([]);
      this.placeQuery.set('');
      this.resetPlaceManualState();
    } else if (['artwork', 'art_artist'].includes(type.name)) {
      this.showEuropeanaSearch.set(true);
      this.europeanaResults.set([]);
      this.europeanaQuery.set('');
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
    this.musicResults.set([]);
    this.musicQuery.set('');
    this.placeResults.set([]);
    this.placeQuery.set('');
    this.resetPlaceManualState();
    this.europeanaResults.set([]);
    this.europeanaQuery.set('');
    this.productResults.set([]);
    this.productQuery.set('');
    this.resetProductBarcodeState();
    this.bggResults.set([]);
    this.bggQuery.set('');
    this.videoGameResults.set([]);
    this.videoGameQuery.set('');
    this.travelResults.set([]);
    this.travelQuery.set('');
    this.concertResults.set([]);
    this.concertQuery.set('');
    this.medicineResults.set([]);
    this.medicineQuery.set('');
    this.plantResults.set([]);
    this.plantQuery.set('');
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
    this.musicResults.set([]);
    this.musicQuery.set('');
    this.placeResults.set([]);
    this.placeQuery.set('');
    this.resetPlaceManualState();
    this.europeanaResults.set([]);
    this.europeanaQuery.set('');
    this.bggResults.set([]);
    this.bggQuery.set('');
    this.videoGameResults.set([]);
    this.videoGameQuery.set('');
    this.travelResults.set([]);
    this.travelQuery.set('');
    this.concertResults.set([]);
    this.concertQuery.set('');
    this.medicineResults.set([]);
    this.medicineQuery.set('');
    this.plantResults.set([]);
    this.plantQuery.set('');
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
    if (!confirm(`Eliminare definitivamente la sotto-lista "${detail.title}"? L'operazione non è reversibile.`)) return;

    this.listService.deleteList(detail.id).subscribe({
      next: () => {
        this.items.update(items => items.map(i =>
          i.id === item.id ? { ...i, child_list: null, child_list_detail: null } : i
        ));
        this.toastr.success('Sotto-lista eliminata.', 'Eliminata');
      },
      error: () => this.toastr.danger('Impossibile eliminare la sotto-lista (solo il proprietario può farlo).', 'Errore')
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

  onMusicQueryChange(q: string): void {
    this.musicQuery.set(q);
    if (q.trim().length < 2) {
      this.musicResults.set([]);
      this.musicSearchLoading.set(false);
      return;
    }
    this.musicSearch$.next(q.trim());
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

  onEuropeanaQueryChange(q: string): void {
    this.europeanaQuery.set(q);
    if (q.trim().length < 2) {
      this.europeanaResults.set([]);
      this.europeanaSearchLoading.set(false);
      return;
    }
    this.europeanaSearch$.next(q.trim());
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

  // ── BoardGameGeek search ──────────────────────────────────────────────────────

  onBggQueryChange(q: string): void {
    this.bggQuery.set(q);
    if (q.trim().length < 2) {
      this.bggResults.set([]);
      this.bggSearchLoading.set(false);
      return;
    }
    this.bggSearch$.next(q.trim());
  }

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

  // ── IGDB search (video_game) ──────────────────────────────────────────────────

  onVideoGameQueryChange(q: string): void {
    this.videoGameQuery.set(q);
    if (q.trim().length < 2) {
      this.videoGameResults.set([]);
      this.videoGameSearchLoading.set(false);
      return;
    }
    this.videoGameSearch$.next(q.trim());
  }

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

  // ── Wikivoyage search (travel_destination) ────────────────────────────────────

  onTravelQueryChange(q: string): void {
    this.travelQuery.set(q);
    if (q.trim().length < 2) {
      this.travelResults.set([]);
      this.travelSearchLoading.set(false);
      return;
    }
    this.travelSearch$.next(q.trim());
  }

  onTravelLanguageChange(event: Event): void {
    this.travelLanguage.set((event.target as HTMLSelectElement).value);
    if (this.travelQuery().trim().length >= 2) {
      this.travelSearch$.next(this.travelQuery().trim());
    }
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

  onConcertQueryChange(q: string): void {
    this.concertQuery.set(q);
    if (q.trim().length < 2) {
      this.concertResults.set([]);
      this.concertSearchLoading.set(false);
      return;
    }
    this.concertSearch$.next(q.trim());
  }

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

  // ── Perenual search (plant) ─────────────────────────────────────────────────────

  onPlantQueryChange(q: string): void {
    this.plantQuery.set(q);
    if (q.trim().length < 2) {
      this.plantResults.set([]);
      this.plantSearchLoading.set(false);
      return;
    }
    this.plantSearch$.next(q.trim());
  }

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

  tvdbMeta(item: Item): { image_url?: string; network?: string; status?: string; year?: number; service_url?: string; type?: string } {
    return (item.metadata ?? {}) as { image_url?: string; network?: string; status?: string; year?: number; service_url?: string; type?: string };
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
