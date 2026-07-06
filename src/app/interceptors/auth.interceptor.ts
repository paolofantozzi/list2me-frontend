import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

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
        return auth.refreshToken().pipe(
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
