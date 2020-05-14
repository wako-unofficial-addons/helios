import { Injectable } from '@angular/core';
import { Episode, Movie, PlaylistVideo, PluginBaseService, Show } from '@wako-app/mobile-sdk';
import { TranslateService } from '@ngx-translate/core';
import { logData } from './tools';
import { DebridAccountService } from './debrid-account.service';
import { ProviderService } from './provider.service';
import { ModalController } from '@ionic/angular';
import { SetupWizardComponent } from '../components/wizard/setup-wizard.component';
import { Storage } from '@ionic/storage';
import { OpenSourceService } from './open-source.service';
import { Settings } from '../entities/settings';
import { SettingsService } from './settings.service';

@Injectable()
export class PluginService extends PluginBaseService {
  constructor(
    protected translate: TranslateService,
    private cloudService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private storage: Storage,
    private openSourceService: OpenSourceService,
    private settingsService: SettingsService
  ) {
    super();
  }

  private async patchSettings() {
    const settingsPatched = await this.storage.get('helios_settings_patched');

    if (settingsPatched) {
      logData('Settings already patched');
      return;
    }

    let settings: Settings = await this.storage.get('helios-settings-key');
    if (!settings) {
      logData(`No Settings don't patch`);

      await this.storage.set('helios_settings_patched', true);
      return;
    }

    logData('Do patch');

    const premiummize_settings = await this.storage.get('premiummize_settings');
    const real_debrid_settings = await this.storage.get('real_debrid_settings');
    const alldebrid_settings = await this.storage.get('alldebrid_settings');

    if (!settings) {
      settings = new Settings();
    }
    if (premiummize_settings) {
      settings.premiumize = premiummize_settings;
    }
    if (real_debrid_settings) {
      settings.realDebrid = real_debrid_settings;
    }
    if (alldebrid_settings) {
      settings.allDebrid = alldebrid_settings;
    }

    if (settings.defaultPlayButtonAction === null || settings.defaultPlayButtonAction.length === 0) {
      settings.defaultPlayButtonAction = 'let-me-choose';
    }

    await this.settingsService.set(settings);

    await this.storage.set('helios_settings_patched', true);

    await this.storage.remove('premiummize_settings');
    await this.storage.remove('real_debrid_settings');
    await this.storage.remove('alldebrid_settings');
    await this.storage.remove('helios-settings-key');
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
}
