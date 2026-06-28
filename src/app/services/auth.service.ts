import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { JWT, LoginRequest, RegisterRequest, TokenRefresh, UserDetail } from '../models/user.model';
import { environment } from '../../environments/environment';

export const API_BASE = environment.apiBase;
const ACCESS_TOKEN_KEY = 'list2me_access';
const REFRESH_TOKEN_KEY = 'list2me_refresh';
const USER_KEY = 'list2me_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = signal<UserDetail | null>(this.loadStoredUser());

  readonly currentUser = this._currentUser.asReadonly();

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<JWT> {
    return this.http.post<JWT>(`${API_BASE}/auth/login/`, credentials).pipe(
      tap(jwt => this.saveSession(jwt))
    );
  }

  register(data: RegisterRequest): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${API_BASE}/auth/register/`, data);
  }

  logout(): Observable<unknown> {
    return this.http.post(`${API_BASE}/auth/logout/`, {}).pipe(
      finalize(() => this.clearSession())
    );
  }

  me(): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${API_BASE}/auth/me/`).pipe(
      tap(user => {
        this._currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  updateMe(data: Partial<UserDetail>): Observable<UserDetail> {
    return this.http.patch<UserDetail>(`${API_BASE}/auth/me/`, data).pipe(
      tap(user => {
        this._currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  requestPasswordReset(email: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${API_BASE}/auth/password/reset/`, { email });
  }

  confirmPasswordReset(
    uid: string,
    token: string,
    new_password1: string,
    new_password2: string
  ): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${API_BASE}/auth/password/reset/confirm/`, {
      uid, token, new_password1, new_password2,
    });
  }

  resendVerificationEmail(email: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${API_BASE}/auth/register/resend-email/`, { email });
  }

  verifyEmail(key: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${API_BASE}/auth/register/verify-email/`, { key });
  }

  googleLogin(accessToken: string): Observable<JWT> {
    return this.http.post<JWT>(`${API_BASE}/auth/google/`, { access_token: accessToken }).pipe(
      tap(jwt => this.saveSession(jwt))
    );
  }

  refreshToken(): Observable<TokenRefresh> {
    const refresh = this.getRefreshToken();
    return this.http.post<TokenRefresh>(`${API_BASE}/auth/token/refresh/`, { refresh }).pipe(
      tap(resp => {
        localStorage.setItem(ACCESS_TOKEN_KEY, resp.access);
        localStorage.setItem(REFRESH_TOKEN_KEY, resp.refresh);
      })
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private saveSession(jwt: JWT): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, jwt.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, jwt.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(jwt.user));
    this._currentUser.set(jwt.user);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
  }

  private loadStoredUser(): UserDetail | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
