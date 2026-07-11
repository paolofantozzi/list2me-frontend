import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { TuiIcon, TuiButton, TuiLoader } from '@taiga-ui/core';
import { Observable, Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs';

/** Forma comune ai risultati di ricerca delle integrazioni esterne più recenti (IGDB, BGG, Wikivoyage, Perenual, ...). */
export interface ExternalSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
}

export interface AttributionLogo {
  src: string;
  alt: string;
  href: string;
}

@Component({
  selector: 'app-external-search-panel',
  standalone: true,
  imports: [TuiIcon, TuiButton, TuiLoader],
  templateUrl: './external-search-panel.component.html',
  styleUrl: './external-search-panel.component.scss',
})
export class ExternalSearchPanelComponent<T extends ExternalSearchResult> implements OnDestroy {
  @Input({ required: true }) title = '';
  @Input({ required: true }) icon = '';
  @Input() placeholder = 'Cerca...';
  /** Ignorati quando è impostato `attributionLogo` (es. il logo "Powered by BGG" obbligatorio per BoardGameGeek). */
  @Input() attributionName = '';
  @Input() attributionUrl = '';
  @Input() attributionLogo: AttributionLogo | null = null;
  /** Es. per il nome scientifico nei risultati Perenual. */
  @Input() italicSubtitle = false;
  @Input({ required: true }) searchFn!: (query: string) => Observable<T[]>;

  @Output() add = new EventEmitter<T>();
  @Output() back = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  query = signal('');
  results = signal<T[]>([]);
  loading = signal(false);

  private readonly search$ = new Subject<string>();
  private readonly subscription: Subscription;

  constructor() {
    this.subscription = this.search$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        filter(q => q.trim().length >= 2),
        switchMap(q => {
          this.loading.set(true);
          return this.searchFn(q).pipe(
            catchError(() => {
              this.loading.set(false);
              return of([] as T[]);
            })
          );
        })
      )
      .subscribe(results => {
        this.results.set(results);
        this.loading.set(false);
      });
  }

  /** Da chiamare quando un controllo proiettato in `[extra-controls]` (es. selettore lingua) cambia, per rilanciare la ricerca con la query corrente. */
  researchCurrentQuery(): void {
    const q = this.query();
    if (q.trim().length >= 2) {
      this.search$.next(q.trim());
    }
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (value.trim().length < 2) {
      this.results.set([]);
      this.loading.set(false);
      return;
    }
    this.search$.next(value.trim());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.search$.complete();
  }
}
