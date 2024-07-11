import { enableProdMode, importProvidersFrom } from '@angular/core';

import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { WakoProviders } from '@wako-app/mobile-sdk';
import { PluginModule } from '../projects/plugin/src/plugin/plugin.module';
import { AppRoutingModule } from './app/app-routing.module';
import { AppComponent } from './app/app.component';
import { PluginLoaderFakeService } from './app/services/plugin-loader-fake.service';
import { PluginLoaderService } from './app/services/plugin-loader.service';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(
            BrowserModule,
            AppRoutingModule,
            TranslateModule.forRoot(),
            PluginModule,
        ),
        {
            provide: RouteReuseStrategy,
            useClass: IonicRouteStrategy,
        },
        {
            provide: PluginLoaderService,
            useClass: PluginLoaderFakeService,
        },
        ...WakoProviders,
        provideIonicAngular({
            swipeBackEnabled: true,
            backButtonText: '',
            mode: 'md',
        })
    ],
}).catch((err) => console.log(err));
