import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { PlantSearchResult, PlantSpecies } from '../models/plant.model';

@Injectable({ providedIn: 'root' })
export class PlantService {
  constructor(private http: HttpClient) {}

  search(q: string, limit = 10): Observable<PlantSearchResult[]> {
    return this.http
      .get<{ results: PlantSearchResult[] }>(`${API_BASE}/plants/search/`, {
        params: { q, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }

  getSpecies(speciesId: number): Observable<PlantSpecies> {
    return this.http.get<PlantSpecies>(`${API_BASE}/plants/species/${speciesId}/`);
  }
}
