import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { ProviderList } from '../../entities/provider';
import { ProviderService } from '../../services/provider.service';
import { ToastService } from '@wako-app/mobile-sdk';
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../entities/settings';

interface ProdviderArray {
  key: string;
  name: string;
  enabled: boolean;
}

@Component({
  templateUrl: './providers.component.html'
})
export class ProvidersComponent implements OnInit {
  providerArray: ProdviderArray[] = [];

  providersUrl = null;

  providerList: ProviderList = null;

  settings: Settings;

  isLoading = false;

  constructor(
    private providerService: ProviderService,
    private alertController: AlertController,
    private translateService: TranslateService,
    private toastService: ToastService,
    public modalCtrl: ModalController,
    private settingsService: SettingsService
  ) {
  }

  async ngOnInit() {
    this.settings = await this.settingsService.get();

    this.providersUrl = await this.providerService.getProviderUrl();

    this.providerList = await this.providerService.getProviders();

    this.providerArray = [];

    if (!this.providerList) {
      return;
    }

    Object.keys(this.providerList).forEach(key => {
      const provider = this.providerList[key];
      this.providerArray.push({
        key: key,
        enabled: provider.enabled,
        name: ProviderService.getNameWithEmojiFlag(provider)
      });
    });
  }

  setUrl() {
    this.alertController
      .create({
        header: 'URL',
        inputs: [
          {
            name: 'url',
            type: 'url',
            placeholder: 'URL',
            value: this.providersUrl ? this.providersUrl : ''
          }
        ],
        buttons: [
          {
            text: this.translateService.instant('alerts.cancelButton'),
            role: 'cancel',
            cssClass: 'secondary'
          },
          {
            text: 'Ok',
            handler: data => {
              this.isLoading = true;
              this.providerService
                .setProvidersFromUrl(data.url)
                .pipe(finalize(() => (this.isLoading = false)))
                .subscribe(success => {
                  if (success) {
                    this.toastService.simpleMessage('toasts.providers.providerUrlAdded');
                    this.ngOnInit();
                  } else {
                    this.toastService.simpleMessage('toasts.providers.providerUrlFailedToAdd');
                  }
                });
            }
          }
        ]
      })
      .then(alert => {
        alert.present();
      });
  }

  toggleSourceQuality() {
    this.settingsService.set(this.settings);
  }

  toggleProvider(key: string, enabled: boolean) {
    this.providerList[key].enabled = enabled;
    this.providerService.setProviders(this.providerList);
  }
}
