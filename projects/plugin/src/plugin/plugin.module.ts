import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';
import { PluginService } from './services/plugin.service';
import { MovieButtonComponent } from './movie-button/movie-button.component';

import { BrowserService, PluginBaseModule } from '@wako-app/mobile-sdk';
import { SettingsComponent } from './settings/settings.component';
import { TranslateModule } from '@ngx-translate/core';
import { EpisodeButtonComponent } from './episode-button/episode-button.component';
import { FormsModule } from '@angular/forms';
import { TorrentSourceService } from './services/sources/torrent-source.service';
import { ProviderService } from './services/provider.service';
import { ProvidersComponent } from './settings/providers/providers.component';
import { DebridAccountService } from './services/debrid-account.service';
import { CloudAccountListComponent } from './settings/cloud-account/cloud-account-list/cloud-account-list.component';
import { CloudFilesComponent } from './settings/cloud-files/cloud-account-files.component';
import { OpenButtonComponent } from './open-button/open-button.component';
import { PluginDetailComponent } from './plugin-detail/plugin-detail.component';
import { SourceListComponent } from './components/source-list/source-list.component';
import { OpenSourceService } from './services/open-source.service';
import { SearchSourceComponent } from './components/search-source/search-source.component';
import { TorrentSourceItemComponent } from './components/torrent-source-item/torrent-source-item.component';
import { FileSizePipe } from './services/file-size.pipe';
import { SourceService } from './services/sources/source.service';
import { SettingsService } from './services/settings.service';
import { CachedTorrentSourceService } from './services/sources/cached-torrent-source.service';
import { DebridSourceItemComponent } from './components/debrid-source-item/debrid-source-item.component';
import { HideKeyboardEnterDirective } from './directives/hide-keyboard-enter.directive';
import { EpisodeItemOptionComponent } from './episode-item-option/episode-item-option.component';
import { SetupWizardComponent } from './components/wizard/setup-wizard.component';
import { ProviderComponent } from './components/provider/provider.component';
import { QualityComponent } from './components/quality/quality.component';
import { DebridAccountComponent } from './components/debrid-account/debrid-account.component';
import { DebridFilesComponent } from './components/debrid-files/debrid-files.component';
import { PlayButtonComponent } from './components/play-button/play-button.component';
import { SupportComponent } from './components/support/support.component';
import { HeliosPlaylistService } from './services/helios-playlist.service';
import { FileSizeFilterComponent } from './components/file-size-filter/file-size-filter.component';
import { SourcePopoverFilterComponent } from './components/source-popover-filter/source-popover-filter.component';
import { ToastService } from './services/toast.service';
import { ClipboardModule } from 'ngx-clipboard';

const components = [
  MovieButtonComponent,
  EpisodeButtonComponent,
  EpisodeItemOptionComponent,
  SettingsComponent,
  ProvidersComponent,
  CloudAccountListComponent,
  CloudFilesComponent,
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
  SourcePopoverFilterComponent
];

const directives = [HideKeyboardEnterDirective];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule.forRoot(), TranslateModule.forRoot(), ClipboardModule],
  declarations: [...components, FileSizePipe, ...directives],
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
    HeliosPlaylistService
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
