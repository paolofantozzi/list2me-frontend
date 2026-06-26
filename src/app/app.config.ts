import { ApplicationConfig, provideBrowserGlobalErrorListeners, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import {
  NbThemeModule,
  NbLayoutModule,
  NbSidebarModule,
  NbMenuModule,
  NbToastrModule,
  NbDialogModule,
  NbCardModule,
  NbButtonModule,
  NbIconModule,
  NbInputModule,
  NbFormFieldModule,
  NbSpinnerModule,
  NbAlertModule,
  NbUserModule,
  NbContextMenuModule,
  NbActionsModule,
  NbListModule,
  NbBadgeModule,
  NbTagModule,
  NbCheckboxModule,
} from '@nebular/theme';
import { NbEvaIconsModule } from '@nebular/eva-icons';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(
      NbThemeModule.forRoot({ name: 'default' }),
      NbEvaIconsModule,
      NbLayoutModule,
      NbSidebarModule.forRoot(),
      NbMenuModule.forRoot(),
      NbToastrModule.forRoot(),
      NbDialogModule.forRoot(),
      NbCardModule,
      NbButtonModule,
      NbIconModule,
      NbInputModule,
      NbFormFieldModule,
      NbSpinnerModule,
      NbAlertModule,
      NbUserModule,
      NbContextMenuModule,
      NbActionsModule,
      NbListModule,
      NbBadgeModule,
      NbTagModule,
      NbCheckboxModule,
    ),
  ]
};
