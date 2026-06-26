import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './auth.service';
import { PaginatedResponse } from '../models/common.model';
import { ItemType, ItemTypeRequest } from '../models/item-type.model';

@Injectable({ providedIn: 'root' })
export class ItemTypeService {
  constructor(private http: HttpClient) {}

  getItemTypes(search?: string): Observable<PaginatedResponse<ItemType>> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<ItemType>>(`${API_BASE}/item-types/`, { params });
  }

  createItemType(data: ItemTypeRequest): Observable<ItemType> {
    return this.http.post<ItemType>(`${API_BASE}/item-types/`, data);
  }

  getItemType(id: string): Observable<ItemType> {
    return this.http.get<ItemType>(`${API_BASE}/item-types/${id}/`);
  }
}
