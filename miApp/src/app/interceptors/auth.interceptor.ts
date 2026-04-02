import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserSessionService } from '../services/user-session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const userSessionService = inject(UserSessionService);
  const token = userSessionService.obtenerTokenActual();

  if (!token || !req.url.startsWith('http://localhost:3000/api/')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
