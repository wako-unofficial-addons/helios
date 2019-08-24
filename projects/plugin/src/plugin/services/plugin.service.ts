import { Injectable } from '@angular/core';
import { PluginBaseService } from '@wako-app/mobile-sdk';
import { TranslateService } from '@ngx-translate/core';
import { logData } from './tools';
import { DebridAccountService } from './debrid-account.service';
import { ProviderService } from './provider.service';

@Injectable()
export class PluginService extends PluginBaseService {
  constructor(protected translate: TranslateService, private cloudService: DebridAccountService, private providerService: ProviderService) {
    super();
  }

  initialize() {
    logData('plugin initialized');

    this.cloudService.initialize();

    this.providerService.setDefaultProvidersIfEmpty();
  }

  afterInstall(): any {
    logData('plugin installed');
  }

  setTranslation(lang: string, translations: any): any {
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    this.translate.setTranslation(lang, translations);
  }
}
