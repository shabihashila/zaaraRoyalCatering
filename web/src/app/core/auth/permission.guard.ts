import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.accessToken() === null) {
    return router.createUrlTree(['/login']);
  }
  return auth.ensureLoaded().pipe(map((ok) => (ok ? true : router.createUrlTree(['/login']))));
};

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['permission'];
  const requiredPermission = typeof required === 'string' ? required : null;

  if (auth.accessToken() === null) {
    return router.createUrlTree(['/login']);
  }
  return auth.ensureLoaded().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login']);
      }
      if (requiredPermission !== null && !auth.hasPermission(requiredPermission)) {
        return router.createUrlTree(['/admin']);
      }
      return true;
    }),
  );
};
