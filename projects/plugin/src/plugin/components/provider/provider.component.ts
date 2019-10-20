import { Component, EventEmitter, NgZone, OnInit, Output } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { ProviderList } from '../../entities/provider';
import { ProviderService } from '../../services/provider.service';
import { ToastService } from '@wako-app/mobile-sdk';

interface ProdviderArray {
  key: string;
  name: string;
  enabled: boolean;
}

@Component({
  selector: 'wk-providers',
  templateUrl: './provider.component.html'
})
export class ProviderComponent implements OnInit {
  @Output() providerAdded = new EventEmitter<boolean>();

  providerArray: ProdviderArray[] = [];

  providersUrls = [];

  providerList: ProviderList = null;

  isLoading = false;

  constructor(
    private providerService: ProviderService,
    private alertController: AlertController,
    private translateService: TranslateService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {
  }

  async ngOnInit() {

    this.providersUrls = await this.providerService.getProviderUrls();

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

    if (this.providerArray.length > 0) {
      this.providerAdded.emit(true);
    }
  }

  async setUrl(index?: number) {
    let providerUrl = '';


    if (index !== undefined) {
      if (this.providersUrls[index]) {
        providerUrl = this.providersUrls[index];
      }
    }

    const alert = await this.alertController
      .create({
        header: 'Provider URL',
        inputs: [
          {
            name: 'url',
            type: 'url',
            placeholder: 'Provider URL',
            value: providerUrl
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
              this.ngZone.run(() => {
                this.isLoading = true;

                this.providerService
                  .addProviderUrl(data.url)
                  .pipe(finalize(() => (this.isLoading = false)))
                  .subscribe(success => {
                    if (success) {
                      this.toastService.simpleMessage('toasts.providers.providerUrlAdded');

                      this.ngOnInit();

                    } else {
                      this.toastService.simpleMessage('toasts.providers.providerUrlFailedToAdd');
                    }
                  });
              });
            }
          }
        ]
      });


    alert.present();
  }


  toggleProvider(key: string, enabled: boolean) {
    this.providerList[key].enabled = enabled;
    this.providerService.setProviders(this.providerList);
  }

  deleteProvider(url: string) {
    this.isLoading = true;

    this.providerService.deleteProviderUrl(url)
      .subscribe(() => {
        this.ngOnInit();
        this.isLoading = false;
      })
  }
}
