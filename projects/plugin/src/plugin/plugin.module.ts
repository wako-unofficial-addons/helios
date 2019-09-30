import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';
import { PluginService } from './services/plugin.service';
import { MovieButtonComponent } from './movie-button/movie-button.component';

import { BrowserService, PluginBaseModule, ToastService } from '@wako-app/mobile-sdk';
import { SettingsComponent } from './settings/settings.component';
import { TranslateModule } from '@ngx-translate/core';
import { EpisodeButtonComponent } from './episode-button/episode-button.component';
import { FormsModule } from '@angular/forms';
import { TorrentSourceService } from './services/sources/torrent-source.service';
import { ProviderService } from './services/provider.service';
import { ProvidersComponent } from './settings/providers/providers.component';
import { DebridAccountService } from './services/debrid-account.service';
import { CloudAccountListComponent } from './settings/cloud-account/cloud-account-list/cloud-account-list.component';
import { OpenButtonComponent } from './open-button/open-button.component';
import { PluginDetailComponent } from './plugin-detail/plugin-detail.component';
import { SourceListComponent } from './components/source-list/source-list.component';
import { OpenSourceService } from './services/open-source.service';
import { SearchSourceComponent } from './components/search-source/search-source.component';
import { TorrentSourceItemComponent } from './components/torrent-source-item/torrent-source-item.component';
import { FileSizePipe } from './services/file-size.pipe';
import { ClipboardModule } from 'ngx-clipboard';
import { SourceService } from './services/sources/source.service';
import { SettingsService } from './services/settings.service';
import { DebridSourceService } from './services/sources/debrid-source.service';
import { DebridSourceItemComponent } from './components/debrid-source-item/debrid-source-item.component';
import { HideKeyboardEnterDirective } from './directives/hide-keyboard-enter.directive';
import { EpisodeItemOptionComponent } from './episode-item-option/episode-item-option.component';


const components = [
  MovieButtonComponent,
  EpisodeButtonComponent,
  EpisodeItemOptionComponent,
  SettingsComponent,
  ProvidersComponent,
  CloudAccountListComponent,
  OpenButtonComponent,
  PluginDetailComponent,
  SourceListComponent,
  SearchSourceComponent,
  TorrentSourceItemComponent,
  DebridSourceItemComponent,
];

const directives = [HideKeyboardEnterDirective];


@NgModule({
  imports: [CommonModule, FormsModule, IonicModule.forRoot(), TranslateModule.forRoot(), ClipboardModule],
  declarations: [...components, FileSizePipe, ...directives],
  entryComponents: [...components],
  providers: [
    PluginService,
    TorrentSourceService,
    ToastService,
    BrowserService,
    ProviderService,
    DebridAccountService,
    OpenSourceService,
    FileSizePipe,
    SourceService,
    SettingsService,
    DebridSourceService
  ] // Add your services here. Do not use provideIn: 'root' in your services
})
export class PluginModule extends PluginBaseModule {
  static pluginService = PluginService;
  static settingsComponent = SettingsComponent;
  static movieComponent = MovieButtonComponent;
  static episodeComponent = EpisodeButtonComponent;
  static episodeItemOptionComponent = EpisodeItemOptionComponent;
  static pluginDetailComponent = PluginDetailComponent;
}
