import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { WakoProviders } from '@wako-app/mobile-sdk';
import { PluginModule } from '../../projects/plugin/src/plugin/plugin.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PluginLoaderFakeService } from './services/plugin-loader-fake.service';
import { PluginLoaderService } from './services/plugin-loader.service';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      swipeBackEnabled: true,
      backButtonText: '',
      mode: 'md',
    }),
    AppRoutingModule,
    TranslateModule.forRoot(),
    PluginModule,
    SharedModule,
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
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
