import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './auth.service';
import { List, Item, ListShare, GroupVisibility, Suggestion, ListDiff, ListWriteData } from '../models/list.model';
import { PaginatedResponse } from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class ListService {
  constructor(private http: HttpClient) {}

  getLists(page?: number, excludeChildren?: boolean): Observable<PaginatedResponse<List>> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (excludeChildren) params = params.set('exclude_children', 'true');
    return this.http.get<PaginatedResponse<List>>(`${API_BASE}/lists/`, { params });
  }

  createList(data: ListWriteData): Observable<List> {
    return this.http.post<List>(`${API_BASE}/lists/`, data);
  }

  getList(id: string): Observable<List> {
    return this.http.get<List>(`${API_BASE}/lists/${id}/`);
  }

  updateList(id: string, data: ListWriteData): Observable<List> {
    return this.http.patch<List>(`${API_BASE}/lists/${id}/`, data);
  }

  deleteList(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/lists/${id}/`);
  }

  forkList(id: string): Observable<List> {
    return this.http.post<List>(`${API_BASE}/lists/${id}/fork/`, {});
  }

  followList(id: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/lists/${id}/follow/`, {});
  }

  unfollowList(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/lists/${id}/follow/`);
  }

  getDiff(id: string): Observable<ListDiff> {
    return this.http.get<ListDiff>(`${API_BASE}/lists/${id}/diff/`);
  }

  mergeList(id: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/lists/${id}/merge/`, {});
  }

  reportList(id: string, reportedToId: string, message: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/lists/${id}/report/`, { reported_to_id: reportedToId, message });
  }

  getShares(listId: string): Observable<ListShare[]> {
    return this.http.get<ListShare[]>(`${API_BASE}/lists/${listId}/shares/`);
  }

  shareList(listId: string, userId: string, permission: 'view' | 'edit' = 'view'): Observable<ListShare> {
    return this.http.post<ListShare>(`${API_BASE}/lists/${listId}/shares/`, { shared_with_id: userId, permission });
  }

  revokeShare(listId: string, shareId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/lists/${listId}/shares/${shareId}/`);
  }

  getGroupVisibility(listId: string): Observable<GroupVisibility[]> {
    return this.http.get<GroupVisibility[]>(`${API_BASE}/lists/${listId}/group-visibility/`);
  }

  addGroupVisibility(listId: string, groupId: string, permission: 'view' | 'edit' = 'view'): Observable<GroupVisibility> {
    return this.http.post<GroupVisibility>(`${API_BASE}/lists/${listId}/group-visibility/`, { group_id: groupId, permission });
  }

  removeGroupVisibility(listId: string, gvId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/lists/${listId}/group-visibility/${gvId}/`);
  }

  getSuggestions(listId: string): Observable<Suggestion[]> {
    return this.http.get<Suggestion[]>(`${API_BASE}/lists/${listId}/suggestions/`);
  }

  createSuggestion(listId: string, description: string, actions: unknown[]): Observable<Suggestion> {
    return this.http.post<Suggestion>(`${API_BASE}/lists/${listId}/suggestions/`, { description, actions });
  }

  acceptSuggestion(listId: string, suggestionId: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/lists/${listId}/suggestions/${suggestionId}/accept/`, {});
  }

  rejectSuggestion(listId: string, suggestionId: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/lists/${listId}/suggestions/${suggestionId}/reject/`, {});
  }
}
