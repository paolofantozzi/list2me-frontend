import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError, finalize, shareReplay } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenRefresh } from '../models/user.model';

// Endpoint pubblici di autenticazione: non devono ricevere un token dell'utente
// (che potrebbe essere stale/riferito a un utente non più esistente, es. dopo un
// reset del DB) altrimenti il backend rifiuta la richiesta con 401 prima ancora
// di eseguirne la logica, bloccando login/registrazione/recupero password.
const PUBLIC_AUTH_PATHS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/register/resend-email/',
  '/auth/register/verify-email/',
  '/auth/google/',
  '/auth/token/refresh/',
  '/auth/password/reset/',
  '/auth/password/reset/confirm/',
];

function isPublicAuthRequest(url: string): boolean {
  return PUBLIC_AUTH_PATHS.some(path => url.endsWith(path));
}

// Più richieste possono ricevere un 401 in parallelo (es. pagine che caricano
// dati con più chiamate simultanee, come /pages/groups). Senza deduplica,
// ognuna chiamerebbe auth.refreshToken() indipendentemente con lo stesso
// refresh token: se il backend ruota/blacklista il refresh token a ogni uso,
// solo la prima richiesta di refresh andrebbe a buon fine e tutte le altre
// verrebbero rifiutate, disconnettendo l'utente subito dopo un login valido.
// Condividendo un'unica chiamata di refresh in-flight, tutte le richieste
// 401 concorrenti attendono lo stesso risultato invece di generarne una a testa.
let refreshInFlight$: Observable<TokenRefresh> | null = null;

function sharedRefreshToken(auth: AuthService): Observable<TokenRefresh> {
  if (!refreshInFlight$) {
    refreshInFlight$ = auth.refreshToken().pipe(
      finalize(() => { refreshInFlight$ = null; }),
      shareReplay(1)
    );
  }
  return refreshInFlight$;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isPublicAuth = isPublicAuthRequest(req.url);
  const token = isPublicAuth ? null : auth.getAccessToken();
  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isPublicAuth) {
        return throwError(() => error);
      }
      if (error.status === 401 && auth.getRefreshToken()) {
        return sharedRefreshToken(auth).pipe(
          switchMap(() => {
            const retryReq = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${auth.getAccessToken()}`)
            });
            return next(retryReq);
          }),
          catchError(refreshError => {
            auth.clearSession();
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          })
        );
      }
      if (error.status === 401) {
        auth.clearSession();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
