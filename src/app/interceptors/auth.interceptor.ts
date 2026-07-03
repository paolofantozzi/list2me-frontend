import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getAccessToken();
  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
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
