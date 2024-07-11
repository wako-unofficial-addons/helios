import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { WakoProviders } from '@wako-app/mobile-sdk';
import { PluginModule } from '../../projects/plugin/src/plugin/plugin.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PluginLoaderFakeService } from './services/plugin-loader-fake.service';
import { PluginLoaderService } from './services/plugin-loader.service';

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        TranslateModule.forRoot(),
        PluginModule,
    ],
    providers: [
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
    bootstrap: [AppComponent],
})
export class AppModule { }
