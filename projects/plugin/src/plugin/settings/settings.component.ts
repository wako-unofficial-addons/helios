import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController, Platform } from '@ionic/angular';
import { ProvidersComponent } from './providers/providers.component';
import { CloudAccountListComponent } from './cloud-account/cloud-account-list/cloud-account-list.component';
import { SettingsService } from '../services/settings.service';
import { PlayButtonAction, PlayButtonActionAndroid, PlayButtonActionIos, Settings } from '../entities/settings';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settings: Settings;

  availablePlayButtonActions: PlayButtonAction[] = [];
  playButtonActionsSettings: { action: PlayButtonAction, enabled: boolean }[] = [];

  constructor(private translate: TranslateService, private modalCtrl: ModalController, private settingsService: SettingsService, private platform: Platform) {
  }

  async ngOnInit() {
    this.settings = await this.settingsService.get();

    this.availablePlayButtonActions = [];
    this.playButtonActionsSettings = [];

    const playActions = this.platform.is('ios') ? PlayButtonActionIos.slice(0) : PlayButtonActionAndroid.slice(0);


    this.settings.availablePlayButtonActions.forEach(action => {
      if (playActions.includes(action)) {
        this.playButtonActionsSettings.push({
          action,
          enabled: true
        });
      }
    });


    playActions.reverse().forEach(action => {
      if (this.settings.availablePlayButtonActions.includes(action)) {
        this.availablePlayButtonActions.push(action);
      }

      if (!this.settings.availablePlayButtonActions.includes(action)) {
        this.playButtonActionsSettings.push({
          action,
          enabled: false
        });
      }
    });
  }

  async openProviders() {
    const modal = await this.modalCtrl.create({
      component: ProvidersComponent
    });

    modal.present();
  }

  async openCloudAccount() {
    const modal = await this.modalCtrl.create({
      component: CloudAccountListComponent
    });

    modal.present();
  }

  changeDefaultPlayButtonAction(value) {
    this.settings.defaultPlayButtonAction = value;

    this.settingsService.set(this.settings);
  }

  doReorder(ev: CustomEvent) {
    console.log(this.playButtonActionsSettings);

    this.playButtonActionsSettings = ev.detail.complete(this.playButtonActionsSettings);

    this.savePlayButtonAction();
  }

  savePlayButtonAction() {
    const actions: PlayButtonAction[] = [];
    this.playButtonActionsSettings.forEach(action => {
      if (action.enabled) {
        actions.push(action.action)
      }
    });

    this.settings.availablePlayButtonActions = actions;

    this.settingsService.set(this.settings);
  }


  setOpenRemoteAfterClickOnPlaySetting(openRemoteAfterClickOnPlay) {
    this.settings.openRemoteAfterClickOnPlay = openRemoteAfterClickOnPlay;

    this.settingsService.set(this.settings);
  }
}
