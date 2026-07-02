import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs';
import { API_BASE } from './auth.service';
import { ItemTypeService } from './item-type.service';
import { PlaceSearchResult } from '../models/place.model';

@Injectable({ providedIn: 'root' })
export class PlaceService {
  private placeItemTypeId: string | null = null;
  private placeItemTypeLoaded = false;

  constructor(
    private http: HttpClient,
    private itemTypeService: ItemTypeService
  ) {}

  search(q: string, limit = 10): Observable<PlaceSearchResult[]> {
    return this.http
      .get<{ results: PlaceSearchResult[] }>(`${API_BASE}/places/search/`, {
        params: { q, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }

  reverse(lat: number, lon: number): Observable<PlaceSearchResult> {
    return this.http.get<PlaceSearchResult>(`${API_BASE}/places/reverse/`, {
      params: { lat: lat.toString(), lon: lon.toString() },
    });
  }

  getPlaceItemTypeId(): Observable<string | null> {
    if (this.placeItemTypeLoaded) return of(this.placeItemTypeId);
    return this.itemTypeService.getItemTypes('place').pipe(
      map(resp => {
        const t = resp.results.find(r => r.name === 'place');
        this.placeItemTypeId = t?.id ?? null;
        this.placeItemTypeLoaded = true;
        return this.placeItemTypeId;
      })
    );
  }
}
