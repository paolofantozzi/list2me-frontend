import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { expand, reduce } from 'rxjs';
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

  /**
   * L'elenco completo dei tipi (usato dal selettore "aggiungi elemento") non deve
   * fermarsi alla prima pagina: `GET /item-types/` è paginato lato backend
   * (PAGE_SIZE=20, senza `page_size` query param configurabile), quindi con più di
   * 20 tipi di sistema il picker perderebbe silenziosamente gli ultimi in ordine
   * alfabetico (osservato: `track`, `travel_destination`, `video_game`).
   */
  getAllItemTypes(): Observable<ItemType[]> {
    return this.getItemTypes().pipe(
      expand(resp => (resp.next ? this.http.get<PaginatedResponse<ItemType>>(resp.next) : EMPTY)),
      reduce((all, resp) => [...all, ...resp.results], [] as ItemType[])
    );
  }

  createItemType(data: ItemTypeRequest): Observable<ItemType> {
    return this.http.post<ItemType>(`${API_BASE}/item-types/`, data);
  }

  getItemType(id: string): Observable<ItemType> {
    return this.http.get<ItemType>(`${API_BASE}/item-types/${id}/`);
  }
}
