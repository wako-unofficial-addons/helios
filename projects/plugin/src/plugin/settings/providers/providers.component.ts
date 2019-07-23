import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { ProviderList } from '../../entities/provider';
import { SourceQuality } from '../../entities/source-quality';
import { ProviderService } from '../../services/provider.service';
import { ToastService } from '../../services/toast.service';

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

  sourceQuality: SourceQuality;

  isLoading = false;

  constructor(
    private providerService: ProviderService,
    private alertController: AlertController,
    private translateService: TranslateService,
    private toastService: ToastService,
    public modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.providerService.getSourceQualitySettings().then(sourceQuality => (this.sourceQuality = sourceQuality));

    this.providerService.getProviderUrl().then(url => {
      this.providersUrl = url;
    });

    this.providerService.getProviders().then(providers => {
      this.providerList = providers;
      this.providerArray = [];

      if (!providers) {
        return;
      }
      Object.keys(providers).forEach(key => {
        const provider = providers[key];
        this.providerArray.push({
          key: key,
          enabled: provider.enabled,
          name: ProviderService.getNameWithEmojiFlag(provider)
        });
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

  toggleSourceQuality(quality: SourceQuality) {
    this.providerService.setSourceQualitySettings(quality);
  }

  toggleProvider(key: string, enabled: boolean) {
    this.providerList[key].enabled = enabled;
    this.providerService.setProviders(this.providerList);
  }
}
