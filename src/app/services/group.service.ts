import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './auth.service';
import { Group, GroupInvite, GroupMember } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class GroupService {
  constructor(private http: HttpClient) {}

  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${API_BASE}/groups/`);
  }

  /**
   * Pending group invitations for the current user.
   * Requires `GET /api/v1/groups/invites/` on the backend — see list2me-backend/TODO.md.
   */
  getPendingInvites(): Observable<GroupInvite[]> {
    return this.http.get<GroupInvite[]>(`${API_BASE}/groups/invites/`);
  }

  createGroup(data: Partial<Group>): Observable<Group> {
    return this.http.post<Group>(`${API_BASE}/groups/`, data);
  }

  getGroup(id: string): Observable<Group> {
    return this.http.get<Group>(`${API_BASE}/groups/${id}/`);
  }

  updateGroup(id: string, data: Partial<Group>): Observable<Group> {
    return this.http.patch<Group>(`${API_BASE}/groups/${id}/`, data);
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/groups/${id}/`);
  }

  getMembers(groupId: string): Observable<GroupMember[]> {
    return this.http.get<GroupMember[]>(`${API_BASE}/groups/${groupId}/members/`);
  }

  removeMember(groupId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/groups/${groupId}/members/${userId}/`);
  }

  inviteUser(groupId: string, userId: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/groups/${groupId}/invite/`, { user_id: userId });
  }

  acceptInvite(groupId: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/groups/${groupId}/accept/`, {});
  }

  declineInvite(groupId: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/groups/${groupId}/decline/`, {});
  }

  leaveGroup(groupId: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/groups/${groupId}/leave/`, {});
  }
}
