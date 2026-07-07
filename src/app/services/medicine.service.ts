import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { MedicineResult } from '../models/medicine.model';

@Injectable({ providedIn: 'root' })
export class MedicineService {
  constructor(private http: HttpClient) {}

  search(q: string, limit = 10): Observable<MedicineResult[]> {
    return this.http
      .get<{ results: MedicineResult[] }>(`${API_BASE}/medicines/search/`, {
        params: { q, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }
}
