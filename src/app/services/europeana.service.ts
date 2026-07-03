import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { EuropeanaEntityType, EuropeanaSearchResult } from '../models/europeana.model';

@Injectable({ providedIn: 'root' })
export class EuropeanaService {
  constructor(private http: HttpClient) {}

  search(q: string, type: EuropeanaEntityType, limit = 10): Observable<EuropeanaSearchResult[]> {
    return this.http
      .get<{ results: EuropeanaSearchResult[] }>(`${API_BASE}/europeana/search/`, {
        params: { q, type, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }
}
