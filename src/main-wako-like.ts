import { enableProdMode, importProvidersFrom } from '@angular/core';

import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';
import { WakoProviders } from '@wako-app/mobile-sdk';
import { HeliosPlaylistService } from 'projects/plugin/src/plugin/services/helios-playlist.service';
import { AppRoutingModule } from './app/app-routing.module';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      AppRoutingModule,
      TranslateModule.forRoot(),
      IonicStorageModule.forRoot({
        name: 'wako',
      }),
    ),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    ...WakoProviders,
    HeliosPlaylistService,
    provideIonicAngular({
      swipeBackEnabled: true,
      backButtonText: '',
      mode: 'md',
    }),
  ],
}).catch((err) => console.error(err));
