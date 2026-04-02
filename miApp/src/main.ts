import { APP_INITIALIZER, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { OrderService } from './app/services/order.service';
import { PlatoService } from './app/services/plato.service';
import { ProfileService } from './app/services/profile.service';
import { SubscriptionService } from './app/services/subscription.service';
import { UserSessionService } from './app/services/user-session.service';
import { authInterceptor } from './app/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const userSessionService = inject(UserSessionService);
        const platoService = inject(PlatoService);
        const orderService = inject(OrderService);
        const profileService = inject(ProfileService);
        const subscriptionService = inject(SubscriptionService);

        return async () => {
          await userSessionService.cargarInicial();
          await platoService.cargarInicial();
          await orderService.cargarInicial();
          await profileService.cargarInicial();
          await subscriptionService.cargarInicial();
        };
      }
    }
  ],
});
