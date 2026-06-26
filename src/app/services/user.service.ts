import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './auth.service';
import { PaginatedResponse } from '../models/common.model';
import { UserPublic } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  searchUsers(query?: string, page?: number): Observable<PaginatedResponse<UserPublic>> {
    let params = new HttpParams();
    if (query) params = params.set('search', query);
    if (page) params = params.set('page', page.toString());
    return this.http.get<PaginatedResponse<UserPublic>>(`${API_BASE}/auth/users/`, { params });
  }

  getUser(userId: string): Observable<UserPublic> {
    return this.http.get<UserPublic>(`${API_BASE}/auth/users/${userId}/`);
  }

  followUser(userId: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/users/${userId}/follow/`, {});
  }

  unfollowUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/users/${userId}/follow/`);
  }

  getFollowers(userId: string): Observable<UserPublic[]> {
    return this.http.get<UserPublic[]>(`${API_BASE}/users/${userId}/followers/`);
  }

  getFollowing(userId: string): Observable<UserPublic[]> {
    return this.http.get<UserPublic[]>(`${API_BASE}/users/${userId}/following/`);
  }
}
