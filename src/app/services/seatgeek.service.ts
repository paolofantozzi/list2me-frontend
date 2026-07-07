import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE } from './auth.service';
import { SeatGeekEvent, SeatGeekSearchResult } from '../models/seatgeek.model';

@Injectable({ providedIn: 'root' })
export class SeatGeekService {
  constructor(private http: HttpClient) {}

  search(q: string, limit = 10): Observable<SeatGeekSearchResult[]> {
    return this.http
      .get<{ results: SeatGeekSearchResult[] }>(`${API_BASE}/seatgeek/search/`, {
        params: { q, limit: limit.toString() },
      })
      .pipe(map(resp => resp.results ?? []));
  }

  getEvent(eventId: number): Observable<SeatGeekEvent> {
    return this.http.get<SeatGeekEvent>(`${API_BASE}/seatgeek/events/${eventId}/`);
  }
}
