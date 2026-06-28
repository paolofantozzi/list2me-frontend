import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './auth.service';
import { Item } from '../models/list.model';

@Injectable({ providedIn: 'root' })
export class ItemService {
  constructor(private http: HttpClient) {}

  getItems(listId: string): Observable<Item[]> {
    return this.http.get<Item[]>(`${API_BASE}/lists/${listId}/items/`);
  }

  addItem(listId: string, data: Partial<Item>): Observable<Item> {
    return this.http.post<Item>(`${API_BASE}/lists/${listId}/items/`, data);
  }

  getItem(listId: string, itemId: string): Observable<Item> {
    return this.http.get<Item>(`${API_BASE}/lists/${listId}/items/${itemId}/`);
  }

  updateItem(listId: string, itemId: string, data: Partial<Item>): Observable<Item> {
    return this.http.patch<Item>(`${API_BASE}/lists/${listId}/items/${itemId}/`, data);
  }

  deleteItem(listId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/lists/${listId}/items/${itemId}/`);
  }

  reorderItems(listId: string, order: { id: string; position: number }[]): Observable<unknown> {
    return this.http.post(`${API_BASE}/lists/${listId}/items/reorder/`, { items: order });
  }

  uploadItemImage(listId: string, itemId: string, file: File): Observable<Item> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<Item>(`${API_BASE}/lists/${listId}/items/${itemId}/image/`, form);
  }

  removeItemImage(listId: string, itemId: string): Observable<Item> {
    return this.http.delete<Item>(`${API_BASE}/lists/${listId}/items/${itemId}/image/`);
  }
}
