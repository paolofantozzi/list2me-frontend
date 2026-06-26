import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './auth.service';
import { PaginatedResponse } from '../models/common.model';
import { Tag } from '../models/tag.model';

@Injectable({ providedIn: 'root' })
export class TagService {
  constructor(private http: HttpClient) {}

  searchTags(query?: string, page?: number): Observable<PaginatedResponse<Tag>> {
    let params = new HttpParams();
    if (query) params = params.set('search', query);
    if (page) params = params.set('page', page.toString());
    return this.http.get<PaginatedResponse<Tag>>(`${API_BASE}/tags/`, { params });
  }
}
