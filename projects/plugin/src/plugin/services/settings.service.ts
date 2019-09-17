import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Settings } from '../entities/settings';
import {  Platform } from '@ionic/angular';

@Injectable()
export class SettingsService {

  readonly heliosSettingsKey = 'helios-settings-key';

  constructor(private storage: Storage, private platform: Platform) {

  }


  async get() {
    let settings: Settings = await this.storage.get(this.heliosSettingsKey);

    if (!settings) {
      settings = new Settings(this.platform.is('android'));
    }

    return settings;
  }

  async set(settings: Settings) {
    return await this.storage.set(this.heliosSettingsKey, settings);
  }
}
