import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController, Platform, IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonToggle, IonReorderGroup, IonReorder } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FileSizeFilterComponent } from '../components/file-size-filter/file-size-filter.component';
import { PlayButtonComponent } from '../components/play-button/play-button.component';
import { SupportComponent } from '../components/support/support.component';
import { SetupWizardComponent } from '../components/wizard/setup-wizard.component';
import { PlayButtonAction, PlayButtonActionAndroid, PlayButtonActionIos, Settings } from '../entities/settings';
import { SettingsService } from '../services/settings.service';
import { CloudAccountListComponent } from './cloud-account/cloud-account-list/cloud-account-list.component';
import { CloudFilesComponent } from './cloud-files/cloud-account-files.component';
import { ProvidersComponent } from './providers/providers.component';
import { addIcons } from "ionicons";
import { settingsOutline, peopleOutline, wifiOutline, listOutline, funnelOutline } from "ionicons/icons";

@Component({
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    standalone: true,
    imports: [SupportComponent, NgIf, FormsModule, PlayButtonComponent, NgFor, FileSizeFilterComponent, TranslateModule, IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonToggle, IonReorderGroup, IonReorder],
})
export class SettingsComponent implements OnInit {
    settings: Settings;

    availablePlayButtonActions: PlayButtonAction[] = [];
    playButtonActionsSettings: { action: PlayButtonAction; enabled: boolean }[] = [];

    constructor(
        private translate: TranslateService,
        private modalCtrl: ModalController,
        private settingsService: SettingsService,
        private platform: Platform,
    ) {
        addIcons({ settingsOutline, peopleOutline, wifiOutline, listOutline, funnelOutline });
    }

    async ngOnInit() {
        this.settings = await this.settingsService.get();

        this.availablePlayButtonActions = [];
        this.playButtonActionsSettings = [];

        const playActions = this.platform.is('ios') ? PlayButtonActionIos.slice(0) : PlayButtonActionAndroid.slice(0);

        this.settings.availablePlayButtonActions.forEach((action) => {
            if (playActions.includes(action)) {
                this.playButtonActionsSettings.push({
                    action,
                    enabled: true,
                });
            }
        });

        playActions.reverse().forEach((action) => {
            if (this.settings.availablePlayButtonActions.includes(action)) {
                this.availablePlayButtonActions.push(action);
            }

            if (!this.settings.availablePlayButtonActions.includes(action)) {
                this.playButtonActionsSettings.push({
                    action,
                    enabled: false,
                });
            }
        });
    }

    async openSetupWizard() {
        const modal = await this.modalCtrl.create({
            component: SetupWizardComponent,
        });

        modal.present();
    }
    async openProviders() {
        const modal = await this.modalCtrl.create({
            component: ProvidersComponent,
        });

        modal.present();
    }

    async openCloudAccount() {
        const modal = await this.modalCtrl.create({
            component: CloudAccountListComponent,
        });

        modal.present();
    }

    async openCloudFiles() {
        const modal = await this.modalCtrl.create({
            component: CloudFilesComponent,
        });

        modal.present();
    }

    doReorder(ev: CustomEvent) {
        console.log(this.playButtonActionsSettings);

        this.playButtonActionsSettings = ev.detail.complete(this.playButtonActionsSettings);

        this.savePlayButtonAction();
    }

    savePlayButtonAction() {
        const actions: PlayButtonAction[] = [];
        this.playButtonActionsSettings.forEach((action) => {
            if (action.enabled) {
                actions.push(action.action);
            }
        });

        this.settings.availablePlayButtonActions = actions;

        this.settingsService.set(this.settings);
    }

    setOpenRemoteAfterClickOnPlaySetting(openRemoteAfterClickOnPlay) {
        this.settings.openRemoteAfterClickOnPlay = openRemoteAfterClickOnPlay;

        this.settingsService.set(this.settings);
    }

    setEnableEpisodeAutomaticPlaylist(enableEpisodeAutomaticPlaylist) {
        this.settings.enableEpisodeAutomaticPlaylist = enableEpisodeAutomaticPlaylist;

        this.settingsService.set(this.settings);
    }
}
