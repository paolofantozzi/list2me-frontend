import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { OpenFoodFactsDomain, OpenFoodFactsSearchResult } from '../models/openfoodfacts.model';

@Injectable({ providedIn: 'root' })
export class OpenFoodFactsService {
  constructor(private http: HttpClient) {}

  search(
    q: string,
    domain: OpenFoodFactsDomain,
    limit = 10,
  ): Observable<OpenFoodFactsSearchResult[]> {
    return this.http
      .get<{ results: OpenFoodFactsSearchResult[] }>(`${API_BASE}/openfoodfacts/search/`, {
        params: { q, domain, limit: limit.toString() },
      })
      .pipe(map((resp) => resp.results ?? []));
  }

  fetchByBarcode(
    barcode: string,
    domain: OpenFoodFactsDomain,
  ): Observable<OpenFoodFactsSearchResult> {
    return this.http.get<OpenFoodFactsSearchResult>(
      `${API_BASE}/openfoodfacts/products/${barcode}/`,
      { params: { domain } },
    );
  }
}
