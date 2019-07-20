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
import { TorrentService } from './services/torrent.service';
import { ToastService } from './services/toast.service';
import { ProviderService } from './services/provider.service';
import { ProvidersComponent } from './settings/providers/providers.component';
import { CloudAccountService } from './services/cloud-account.service';
import { CloudAccountListComponent } from './settings/cloud-account/cloud-account-list/cloud-account-list.component';
import { OpenButtonComponent } from './open-button/open-button.component';
import { PluginDetailComponent } from './plugin-detail/plugin-detail.component';
import { SourceListComponent } from './components/source-list/source-list.component';
import { OpenSourceService } from './services/open-source.service';
import { SearchSourceComponent } from './components/search-source/search-source.component';
import { SourceItemComponent } from './components/source-item/source-item.component';
import { FileSizePipe } from './services/file-size.pipe';
import { ClipboardModule } from 'ngx-clipboard';


const components = [
  MovieButtonComponent,
  EpisodeButtonComponent,
  SettingsComponent,
  ProvidersComponent,
  CloudAccountListComponent,
  OpenButtonComponent,
  PluginDetailComponent,
  SourceListComponent,
  SearchSourceComponent,
  SourceItemComponent,
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule.forRoot(), TranslateModule.forRoot(), ClipboardModule],
  declarations: [...components, FileSizePipe],
  entryComponents: [...components],
  providers: [
    PluginService,
    TorrentService,
    ToastService,
    BrowserService,
    ProviderService,
    CloudAccountService,
    OpenSourceService,
    FileSizePipe
  ] // Add your services here. Do not use provideIn: 'root' in your services
})
export class PluginModule extends PluginBaseModule {
  static pluginService = PluginService;
  static settingsComponent = SettingsComponent;
  static movieComponent = MovieButtonComponent;
  static episodeComponent = EpisodeButtonComponent;
  static pluginDetailComponent = PluginDetailComponent;
}
