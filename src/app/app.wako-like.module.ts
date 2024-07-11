import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';
import { WakoProviders } from '@wako-app/mobile-sdk';
import { HeliosPlaylistService } from 'projects/plugin/src/plugin/services/helios-playlist.service';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
        IonicStorageModule.forRoot({
            name: 'wako',
        }),
        SharedModule,
    ],
    providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, ...WakoProviders, HeliosPlaylistService],
    bootstrap: [AppComponent],
})
export class AppWakoLikeModule { }
