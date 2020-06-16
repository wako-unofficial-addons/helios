import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { IonicStorageModule } from '@ionic/storage';
import { PluginModule } from '../../projects/plugin/src/plugin/plugin.module';
import { PluginLoaderFakeService } from './services/plugin-loader-fake.service';
import { PluginLoaderService } from './services/plugin-loader.service';
import { SharedModule } from './shared/shared.module';
import { WakoProviders } from '@wako-app/mobile-sdk';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      swipeBackEnabled: true,
      backButtonText: '',
      mode: 'md'
    }),
    AppRoutingModule,
    TranslateModule.forRoot(),
    IonicStorageModule.forRoot(),
    PluginModule,
    SharedModule
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    },
    {
      provide: PluginLoaderService,
      useClass: PluginLoaderFakeService
    },
    ...WakoProviders
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
