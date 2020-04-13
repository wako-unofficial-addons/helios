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
    PluginModule
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    },
    {
      provide: PluginLoaderService,
      useClass: PluginLoaderFakeService
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
