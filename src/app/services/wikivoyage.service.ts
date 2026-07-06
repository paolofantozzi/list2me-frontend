import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { WikivoyageGuide, WikivoyageSearchResult } from '../models/wikivoyage.model';

@Injectable({ providedIn: 'root' })
export class WikivoyageService {
  constructor(private http: HttpClient) {}

  search(q: string, lang = 'en', limit = 10): Observable<WikivoyageSearchResult[]> {
    return this.http
      .get<{ results: WikivoyageSearchResult[] }>(`${API_BASE}/wikivoyage/search/`, {
        params: { q, lang, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }

  getGuide(pageId: number, lang = 'en'): Observable<WikivoyageGuide> {
    return this.http.get<WikivoyageGuide>(`${API_BASE}/wikivoyage/guides/${pageId}/`, {
      params: { lang },
    });
  }
}
