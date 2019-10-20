import { Injectable } from '@angular/core';
import { PluginBaseService } from '@wako-app/mobile-sdk';
import { TranslateService } from '@ngx-translate/core';
import { logData } from './tools';
import { DebridAccountService } from './debrid-account.service';
import { ProviderService } from './provider.service';
import { ModalController } from '@ionic/angular';
import { SetupWizardComponent } from '../components/wizard/setup-wizard.component';
import { Storage } from '@ionic/storage';
import { HeliosCacheService } from './provider-cache.service';

@Injectable()
export class PluginService extends PluginBaseService {
  constructor(
    protected translate: TranslateService,
    private cloudService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private storage: Storage
  ) {
    super();
  }

  initialize() {
    logData('plugin initialized');

    this.cloudService.initialize();

    this.providerService.initialize();
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

  private async runSetupWizard() {
    const wizardSeen = await this.storage.get('helios_setup_wizard_seen');
    if (wizardSeen) {
      return;
    }

    this.storage.set('helios_setup_wizard_seen', true);

    const providers = await this.providerService.getProviderUrls();
    if (providers.length > 0) {
      return;
    }


    const modal = await this.modalController.create({
      component: SetupWizardComponent
    });

    await modal.present();
  }
}
