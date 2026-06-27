import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs';
import { API_BASE } from './auth.service';
import { ItemTypeService } from './item-type.service';
import { BookResult, BookEdition } from '../models/book.model';
import { Item } from '../models/list.model';

@Injectable({ providedIn: 'root' })
export class BookService {
  private bookItemTypeId: string | null = null;
  private bookItemTypeLoaded = false;

  constructor(
    private http: HttpClient,
    private itemTypeService: ItemTypeService
  ) {}

  search(q: string, limit = 10): Observable<BookResult[]> {
    return this.http.get<BookResult[] | { results: BookResult[] }>(`${API_BASE}/books/search/`, {
      params: { q, limit: limit.toString() }
    }).pipe(
      map(resp => Array.isArray(resp) ? resp : (resp.results ?? []))
    );
  }

  getEditions(workKey: string, limit = 20): Observable<BookEdition[]> {
    return this.http.get<{ editions: BookEdition[] }>(`${API_BASE}/books/editions/`, {
      params: { work_key: workKey, limit: limit.toString() }
    }).pipe(
      map(resp => resp.editions ?? [])
    );
  }

  syncBook(listId: string, itemId: string, openLibraryKey?: string): Observable<Item> {
    const body = openLibraryKey ? { open_library_key: openLibraryKey } : {};
    return this.http.post<Item>(`${API_BASE}/lists/${listId}/items/${itemId}/sync-book/`, body);
  }

  getBookItemTypeId(): Observable<string | null> {
    if (this.bookItemTypeLoaded) return of(this.bookItemTypeId);
    return this.itemTypeService.getItemTypes('book').pipe(
      map(resp => {
        const bt = resp.results.find(t => t.name === 'book');
        this.bookItemTypeId = bt?.id ?? null;
        this.bookItemTypeLoaded = true;
        return this.bookItemTypeId;
      })
    );
  }
}
