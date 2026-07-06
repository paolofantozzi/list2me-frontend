import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { IGDBGameDetail, IGDBSearchResult } from '../models/igdb.model';

@Injectable({ providedIn: 'root' })
export class IgdbService {
  constructor(private http: HttpClient) {}

  search(q: string, limit = 10): Observable<IGDBSearchResult[]> {
    return this.http
      .get<{ results: IGDBSearchResult[] }>(`${API_BASE}/igdb/search/`, {
        params: { q, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }

  getGame(gameId: number): Observable<IGDBGameDetail> {
    return this.http.get<IGDBGameDetail>(`${API_BASE}/igdb/games/${gameId}/`);
  }
}
