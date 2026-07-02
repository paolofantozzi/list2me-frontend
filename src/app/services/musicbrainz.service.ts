import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { ItemTypeService } from './item-type.service';
import { MusicBrainzEntityType, MusicBrainzSearchResult } from '../models/musicbrainz.model';

@Injectable({ providedIn: 'root' })
export class MusicBrainzService {
  private typeIdCache = new Map<string, string | null>();
  private typeIdLoaded = new Set<string>();

  constructor(
    private http: HttpClient,
    private itemTypeService: ItemTypeService
  ) {}

  search(q: string, type: MusicBrainzEntityType, limit = 10): Observable<MusicBrainzSearchResult[]> {
    return this.http
      .get<{ results: MusicBrainzSearchResult[] }>(`${API_BASE}/musicbrainz/search/`, {
        params: { q, type, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
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
