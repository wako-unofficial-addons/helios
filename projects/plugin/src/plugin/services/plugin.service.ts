import { Injectable } from '@angular/core';
import {
  BrowserService,
  Episode,
  ExplorerFile,
  ExplorerFolderItem,
  KodiOpenParams,
  Movie,
  OpenMedia,
  PlaylistVideo,
  PluginBaseService,
  Show,
  WakoFileActionButton,
  WakoFileActionService
} from '@wako-app/mobile-sdk';
import { TranslateService } from '@ngx-translate/core';
import { logData } from './tools';
import { DebridAccountService } from './debrid-account.service';
import { ProviderService } from './provider.service';
import { ModalController, Platform } from '@ionic/angular';
import { SetupWizardComponent } from '../components/wizard/setup-wizard.component';
import { Storage } from '@ionic/storage';
import { OpenSourceService } from './open-source.service';
import { SettingsService } from './settings.service';
import { ExplorerService } from './explorer.service';

declare const device: any;

@Injectable()
export class PluginService extends PluginBaseService {
  constructor(
    protected translate: TranslateService,
    private cloudService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private storage: Storage,
    private openSourceService: OpenSourceService,
    private settingsService: SettingsService,
    private platform: Platform,
    private explorerService: ExplorerService,
    private fileActionService: WakoFileActionService
  ) {
    super();
  }

  private async patchSettings() {
    const settingsPatched = await this.storage.get('helios_settings_patched2');

    if (settingsPatched) {
      logData('Settings already patched');
      return;
    }

    const settings = await this.settingsService.get();

    if (this.platform.is('android') && typeof device !== 'undefined' && device['version']) {
      const deviceVersion = +device['version'];
      if (deviceVersion < 7) {
        settings.simultaneousProviderQueries = 3;
        await this.settingsService.set(settings);
      }
    }
    await this.storage.set('helios_settings_patched2', true);
  }

  async initialize() {
    logData('plugin initialized');

    await this.patchSettings();

    await this.providerService.initialize();

    await this.cloudService.initialize();
  }

  afterInstall(): any {
    logData('plugin installed');

    this.runSetupWizard();
  }

  setTranslation(lang: string, translations: any): any {
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    this.translate.setTranslation(lang, translations);
  }

  customAction(action: string, data: any): any {
    if (action === 'resume') {
      const item = data as PlaylistVideo;
      console.log('HELIOS resume', item);
      this.openSourceService.openPlaylistVideo(item);
    }
  }

  private async runSetupWizard() {
    const wizardSeen = await this.storage.get('helios_setup_wizard_seen_for_dev');
    if (wizardSeen) {
      // Only for test purpose
      return;
    }
    if (document.location.href.match('localhost:4200')) {
      await this.storage.set('helios_setup_wizard_seen_for_dev', true);
    }

    const modal = await this.modalController.create({
      component: SetupWizardComponent,
      backdropDismiss: false
    });

    await modal.present();
  }

  beforeMovieMiddleware(movie: Movie): Promise<Movie> {
    throw new Error('Method not implemented.');
  }

  afterMovieMiddleware(movie: Movie): Promise<Movie> {
    throw new Error('Method not implemented.');
  }

  beforeShowMiddleware(show: Show): Promise<Show> {
    throw new Error('Method not implemented.');
  }

  afterShowMiddleware(show: Show): Promise<Show> {
    throw new Error('Method not implemented.');
  }

  beforeEpisodeMiddleware(show: Show, episode: Episode): Promise<Episode> {
    throw new Error('Method not implemented.');
  }

  afterEpisodeMiddleware(show: Show, episode: Episode): Promise<Episode> {
    throw new Error('Method not implemented.');
  }

  fetchExplorerFolderItem(): Promise<ExplorerFolderItem[]> {
    return this.explorerService.get().toPromise();
  }

  async getFileActionButtons(
    file: ExplorerFile,
    title?: string,
    posterUrl?: string,
    seekTo?: number,
    openMedia?: OpenMedia,
    kodiOpenParams?: KodiOpenParams
  ): Promise<WakoFileActionButton[]> {
    const link = await this.explorerService.getLinkRD(file);

    const actions = await this.fileActionService.getFileActionButtons(link, link, title, posterUrl, seekTo, openMedia, kodiOpenParams);

    actions.forEach((action) => {
      if (action.action === 'play-browser' && file.customData.servicePlayerUrl) {
        action.handler = () => {
          if (this.platform.is('ios')) {
            BrowserService.open(file.customData.servicePlayerUrl, true);
          } else {
            window.open(file.customData.servicePlayerUrl, '_system', 'location=yes');
          }
        };
      }
    });

    return actions;
  }
}
