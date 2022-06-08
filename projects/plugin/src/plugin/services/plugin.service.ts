import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import {
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
  WakoFileActionService,
  WakoStorage,
} from '@wako-app/mobile-sdk';
import { SetupWizardComponent } from '../components/wizard/setup-wizard.component';
import { DebridAccountService } from './debrid-account.service';
import { ExplorerService } from './explorer.service';
import { OpenSourceService } from './open-source.service';
import { ProviderService } from './provider.service';
import { logData } from './tools';

declare const device: any;

@Injectable()
export class PluginService extends PluginBaseService {
  constructor(
    protected translate: TranslateService,
    private cloudService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private storage: WakoStorage,
    private openSourceService: OpenSourceService,
    private explorerService: ExplorerService,
    private fileActionService: WakoFileActionService
  ) {
    super();
  }

  async initialize() {
    logData('plugin initialized');

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
      backdropDismiss: false,
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
    const link = await this.explorerService.getLinkFromFile(file);

    return await this.fileActionService.getFileActionButtons(
      link,
      link,
      title,
      posterUrl,
      seekTo,
      openMedia,
      kodiOpenParams
    );
  }
}
