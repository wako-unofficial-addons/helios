import { Injectable } from '@angular/core';
import { PlaylistVideo, PluginBaseService } from '@wako-app/mobile-sdk';
import { TranslateService } from '@ngx-translate/core';
import { logData } from './tools';
import { DebridAccountService } from './debrid-account.service';
import { ProviderService } from './provider.service';
import { ModalController } from '@ionic/angular';
import { SetupWizardComponent } from '../components/wizard/setup-wizard.component';
import { Storage } from '@ionic/storage';
import { OpenSourceService } from './open-source.service';

@Injectable()
export class PluginService extends PluginBaseService {
  constructor(
    protected translate: TranslateService,
    private cloudService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private storage: Storage,
    private openSourceService: OpenSourceService
  ) {
    super();
  }

  async initialize() {
    logData('plugin initialized');

    await this.cloudService.initialize();

    await this.providerService.initialize();
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
    if (wizardSeen) { // Only for test purpose
     return;
    }

    const modal = await this.modalController.create({
      component: SetupWizardComponent,
      backdropDismiss: false
    });

    await modal.present();

  }
}
