import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';
import { BrowserService, PluginBaseModule, WakoProviders } from '@wako-app/mobile-sdk';
import { ClipboardModule } from 'ngx-clipboard';
import { DebridAccountComponent } from './components/debrid-account/debrid-account.component';
import { DebridFilesComponent } from './components/debrid-files/debrid-files.component';
import { DebridSourceItemComponent } from './components/debrid-source-item/debrid-source-item.component';
import { DisclaimerComponent } from './components/disclaimer/disclaimer.component';
import { FileSizeFilterComponent } from './components/file-size-filter/file-size-filter.component';
import { PlayButtonComponent } from './components/play-button/play-button.component';
import { ProviderComponent } from './components/provider/provider.component';
import { QualityComponent } from './components/quality/quality.component';
import { SearchSourceComponent } from './components/search-source/search-source.component';
import { SourceListComponent } from './components/source-list/source-list.component';
import { SourcePopoverFilterComponent } from './components/source-popover-filter/source-popover-filter.component';
import { SupportComponent } from './components/support/support.component';
import { TorrentSourceItemComponent } from './components/torrent-source-item/torrent-source-item.component';
import { SetupWizardComponent } from './components/wizard/setup-wizard.component';
import { HideKeyboardEnterDirective } from './directives/hide-keyboard-enter.directive';
import { EpisodeButtonComponent } from './episode-button/episode-button.component';
import { EpisodeItemOptionComponent } from './episode-item-option/episode-item-option.component';
import { MovieButtonComponent } from './movie-button/movie-button.component';
import { OpenButtonComponent } from './open-button/open-button.component';
import { PluginDetailComponent } from './plugin-detail/plugin-detail.component';
import { DebridAccountService } from './services/debrid-account.service';
import { ExplorerService } from './services/explorer.service';
import { FileSizePipe } from './services/file-size.pipe';
import { HeliosPlaylistService } from './services/helios-playlist.service';
import { OpenSourceService } from './services/open-source.service';
import { PluginService } from './services/plugin.service';
import { ProviderService } from './services/provider.service';
import { SettingsService } from './services/settings.service';
import { CachedTorrentSourceService } from './services/sources/cached-torrent-source.service';
import { SourceService } from './services/sources/source.service';
import { TorrentSourceService } from './services/sources/torrent-source.service';
import { ToastService } from './services/toast.service';
import { CloudAccountListComponent } from './settings/cloud-account/cloud-account-list/cloud-account-list.component';

import { ProvidersComponent } from './settings/providers/providers.component';
import { SettingsComponent } from './settings/settings.component';

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
  SetupWizardComponent,
  ProviderComponent,
  QualityComponent,
  DebridAccountComponent,
  DebridFilesComponent,
  PlayButtonComponent,
  SupportComponent,
  FileSizeFilterComponent,
  DisclaimerComponent,
  SourcePopoverFilterComponent,
];

const directives = [HideKeyboardEnterDirective];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forRoot(),
    ClipboardModule,
    IonicStorageModule.forRoot({}),
    ...components,
    FileSizePipe,
    ...directives,
  ],
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
    CachedTorrentSourceService,
    HeliosPlaylistService,
    ExplorerService,
    ...WakoProviders,
    provideIonicAngular({
      swipeBackEnabled: true,
      backButtonText: '',
      mode: 'md',
    }),
  ], // Add your services here. Do not use provideIn: 'root' in your services
})
export class PluginModule extends PluginBaseModule {
  static pluginService = PluginService;
  static settingsComponent = SettingsComponent;
  static movieComponent = MovieButtonComponent;
  static episodeComponent = EpisodeButtonComponent;
  static episodeItemOptionComponent = EpisodeItemOptionComponent;
  static pluginDetailComponent = PluginDetailComponent;
}
