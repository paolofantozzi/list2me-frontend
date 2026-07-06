import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { BGGGameDetail, BGGSearchResult, BGGSearchType } from '../models/bgg.model';

@Injectable({ providedIn: 'root' })
export class BggService {
  constructor(private http: HttpClient) {}

  search(q: string, type: BGGSearchType, limit = 10): Observable<BGGSearchResult[]> {
    return this.http
      .get<{ results: BGGSearchResult[] }>(`${API_BASE}/bgg/search/`, {
        params: { q, type, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }

  getGame(gameId: number): Observable<BGGGameDetail> {
    return this.http.get<BGGGameDetail>(`${API_BASE}/bgg/games/${gameId}/`);
  }
}
