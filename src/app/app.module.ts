import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { IonicStorageModule } from '@ionic/storage';
import { ModuleLoaderService, PluginLoaderService } from '@wako-app/mobile-sdk';
import { PluginLoaderFakeService } from './services/plugin-loader-fake.service';
import { PluginModule } from '../../projects/plugin/src/plugin/plugin.module';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
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
    PluginModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    ModuleLoaderService,
    PluginLoaderService,
    {
      provide: PluginLoaderService,
      useClass: PluginLoaderFakeService
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
