import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEsAr from '@angular/common/locales/es-AR';
import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler, importProvidersFrom } from '@angular/core';
import { LOCALE_ID } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { JoyrideModule } from 'ngx-joyride';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { DialogService } from 'primeng/dynamicdialog';

import LccPreset from '../lcc-preset';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/error-handling/global-error-handler';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { caseConverterInterceptor } from './core/interceptors/case-converter.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { mockApiInterceptor } from './core/interceptors/mock-api.interceptor';

registerLocaleData(localeEsAr, 'es-AR');
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-AR' },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([
      mockApiInterceptor,  // Mock debe ir PRIMERO para interceptar antes que otros
      loggingInterceptor,
      authInterceptor,
      caseConverterInterceptor
    ])),
    MessageService,
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: LccPreset,
        options: {
          darkModeSelector: 'none'
        }
      }
    }),
    DialogService,
    importProvidersFrom(JoyrideModule.forRoot())
  ]
};
