import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, NgZone, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonInput, IonSpinner, IonItemSliding, IonItemOptions, IonItemOption, IonToggle } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { ProviderList } from '../../entities/provider';
import { Settings } from '../../entities/settings';
import { ProviderService } from '../../services/provider.service';
import { SettingsService } from '../../services/settings.service';
import { ToastService } from '../../services/toast.service';
import { addIcons } from "ionicons";
import { speedometerOutline, logoDropbox, trashOutline, listOutline } from "ionicons/icons";

interface ProdviderArray {
    key: string;
    name: string;
    enabled: boolean;
}

@Component({
    selector: 'wk-providers',
    templateUrl: './provider.component.html',
    styleUrls: ['./provider.component.scss'],
    standalone: true,
    imports: [NgIf, FormsModule, NgFor, TranslateModule, IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonInput, IonSpinner, IonItemSliding, IonItemOptions, IonItemOption, IonToggle],
})
export class ProviderComponent implements OnInit {
    @Output() providerAdded = new EventEmitter<boolean>();

    providerArray: ProdviderArray[] = [];

    providersUrls = [];

    providerList: ProviderList = null;

    isLoading = false;

    settings: Settings = null;

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

        if (!this.providerList) {
            return;
        }

        Object.keys(this.providerList).forEach((key) => {
            const provider = this.providerList[key];
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

    deleteProvider(url: string) {
        this.isLoading = true;

        this.providerService.deleteProviderUrl(url).subscribe(() => {
            this.ngOnInit();
            this.isLoading = false;
        });
    }

    async setSettings() {
        return await this.settingsService.set(this.settings);
    }
}
