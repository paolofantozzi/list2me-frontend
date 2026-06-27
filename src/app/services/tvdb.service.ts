import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { ItemTypeService } from './item-type.service';
import {
  TvdbSearchResult,
  TvdbSeries,
  TvdbEpisodesPage,
  TvdbMovie,
  TvdbLanguage,
} from '../models/tvdb.model';

@Injectable({ providedIn: 'root' })
export class TvdbService {
  private languages$: Observable<TvdbLanguage[]> | null = null;
  private typeIdCache = new Map<string, string | null>();
  private typeIdLoaded = new Set<string>();

  constructor(
    private http: HttpClient,
    private itemTypeService: ItemTypeService
  ) {}

  search(q: string, type?: string, language = 'eng', limit = 10): Observable<TvdbSearchResult[]> {
    const params: Record<string, string> = { q, language, limit: limit.toString() };
    if (type) params['type'] = type;
    return this.http
      .get<{ results: TvdbSearchResult[] }>(`${API_BASE}/tvdb/search/`, { params })
      .pipe(map(resp => resp.results ?? []));
  }

  getSeries(seriesId: number, language = 'eng'): Observable<TvdbSeries> {
    return this.http.get<TvdbSeries>(`${API_BASE}/tvdb/series/${seriesId}/`, {
      params: { language },
    });
  }

  getSeriesEpisodes(
    seriesId: number,
    season?: number,
    page = 0,
    language = 'eng'
  ): Observable<TvdbEpisodesPage> {
    const params: Record<string, string> = { language, page: page.toString() };
    if (season !== undefined) params['season'] = season.toString();
    return this.http.get<TvdbEpisodesPage>(`${API_BASE}/tvdb/series/${seriesId}/episodes/`, {
      params,
    });
  }

  getMovie(movieId: number, language = 'eng'): Observable<TvdbMovie> {
    return this.http.get<TvdbMovie>(`${API_BASE}/tvdb/movies/${movieId}/`, {
      params: { language },
    });
  }

  getLanguages(): Observable<TvdbLanguage[]> {
    if (!this.languages$) {
      this.languages$ = this.http
        .get<{ languages: TvdbLanguage[] }>(`${API_BASE}/tvdb/languages/`)
        .pipe(
          map(resp => resp.languages ?? []),
          shareReplay(1)
        );
    }
    return this.languages$;
  }

  getItemTypeId(typeName: string): Observable<string | null> {
    if (this.typeIdLoaded.has(typeName)) {
      return of(this.typeIdCache.get(typeName) ?? null);
    }
    return this.itemTypeService.getItemTypes(typeName).pipe(
      map(resp => {
        const t = resp.results.find(r => r.name === typeName);
        const id = t?.id ?? null;
        this.typeIdCache.set(typeName, id);
        this.typeIdLoaded.add(typeName);
        return id;
      })
    );
  }
}
