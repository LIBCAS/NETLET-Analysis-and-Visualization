import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders, importProvidersFrom, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export const testProviders: Array<Provider | EnvironmentProviders> = [
  provideHttpClient(),
  provideRouter([]),
  importProvidersFrom(TranslateModule.forRoot()),
];
