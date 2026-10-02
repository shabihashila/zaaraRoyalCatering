import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const targetsApi = req.url.startsWith(API_BASE_URL) || req.url.startsWith('/api/');

  const outgoing = token !== null && targetsApi && !isAuthEndpoint(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !targetsApi || isAuthEndpoint(req.url)) {
        return throwError(() => err);
      }
      // Access token expired: try the httpOnly refresh cookie once, then retry.
      return auth.refresh().pipe(
        switchMap((ok) => {
          if (!ok) {
            return throwError(() => err);
          }
          const retryToken = auth.accessToken();
          const retry =
            retryToken !== null ? req.clone({ setHeaders: { Authorization: `Bearer ${retryToken}` } }) : req;
          return next(retry);
        }),
      );
    }),
  );
};
