import { Component, EventEmitter, NgZone, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonIcon,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonSpinner,
  IonToggle,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { listOutline, logoDropbox, speedometerOutline, trashOutline } from 'ionicons/icons';
import { finalize } from 'rxjs/operators';
import { fixProvider, ProviderList } from '../../entities/provider';
import { Settings } from '../../entities/settings';
import { ProviderService } from '../../services/provider.service';
import { SettingsService } from '../../services/settings.service';
import { ToastService } from '../../services/toast.service';
import { WakoGlobal } from '@wako-app/mobile-sdk';

interface ProdviderArray {
  key: string;
  name: string;
  enabled: boolean;
}

@Component({
  selector: 'wk-providers',
  templateUrl: './provider.component.html',
  styleUrls: ['./provider.component.scss'],
  imports: [
    IonGrid,
    FormsModule,
    TranslateModule,
    IonList,
    IonListHeader,
    IonLabel,
    IonIcon,
    IonItem,
    IonInput,
    IonSpinner,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonToggle,
    IonButton,
    IonRow,
    IonCol,
  ],
})
export class ProviderComponent implements OnInit {
  @Output() providerAdded = new EventEmitter<boolean>();

  providerArray: ProdviderArray[] = [];

  providersUrls = [];

  providerList: ProviderList = null;

  isLoading = false;

  settings: Settings = null;

  isTvLayout = false;

  constructor(
    private providerService: ProviderService,
    private alertController: AlertController,
    private translateService: TranslateService,
    private toastService: ToastService,
    private ngZone: NgZone,
    private settingsService: SettingsService,
  ) {
    addIcons({ speedometerOutline, logoDropbox, trashOutline, listOutline });
  }

  async ngOnInit() {
    this.providersUrls = await this.providerService.getProviderUrls();

    this.providerList = await this.providerService.getProviders();

    this.providerArray = [];

    this.settings = await this.settingsService.get();

    this.isTvLayout = WakoGlobal.isTvLayout;

    if (!this.providerList) {
      return;
    }

    Object.keys(this.providerList).forEach((key) => {
      const provider = this.providerList[key];
      fixProvider(provider);

      this.providerArray.push({
        key: key,
        enabled: provider.enabled,
        name: ProviderService.getNameWithEmojiFlag(provider),
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

    const alert = await this.alertController.create({
      header: 'Provider URL',
      inputs: [
        {
          name: 'url',
          type: 'url',
          placeholder: 'Provider URL',
          value: providerUrl,
        },
      ],
      buttons: [
        {
          text: this.translateService.instant('alerts.cancelButton'),
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Ok',
          handler: (data) => {
            this.ngZone.run(() => {
              this.isLoading = true;

              this.providerService
                .addProviderUrl(data.url)
                .pipe(finalize(() => (this.isLoading = false)))
                .subscribe(
                  (success) => {
                    if (success) {
                      this.toastService.simpleMessage('toasts.providers.providerUrlAdded');

                      this.ngOnInit();
                    } else {
                      this.toastService.simpleMessage('toasts.providers.providerUrlFailedToAdd');
                    }
                  },
                  (err) => {
                    this.toastService.simpleMessage('toasts.providers.providerUrlFailedToAdd');
                  },
                );
            });
          },
        },
      ],
    });

    alert.present();
  }

  toggleProvider(key: string, enabled: boolean) {
    this.providerList[key].enabled = enabled;
    this.providerService.setProviders(this.providerList);
  }

  async deleteProvider(url: string) {
    const alert = await this.alertController.create({
      header: this.translateService.instant('alerts.confirmation'),
      message: this.translateService.instant('alerts.providers.deleteConfirmation'),
      buttons: [
        {
          text: this.translateService.instant('alerts.cancelButton'),
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: this.translateService.instant('alerts.okButton'),
          handler: () => {
            this.isLoading = true;
            this.providerService.deleteProviderUrl(url).subscribe(() => {
              this.ngOnInit();
              this.isLoading = false;
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async setSettings() {
    return await this.settingsService.set(this.settings);
  }
}
