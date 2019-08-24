import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Settings } from '../entities/settings';

@Injectable()
export class SettingsService {

  readonly heliosSettingsKey = 'helios-settings-key';

  constructor(private storage: Storage) {

  }


  async get() {
    let settings: Settings = await this.storage.get(this.heliosSettingsKey);

    if (!settings) {
      settings = new Settings();
    }

    return settings;
  }

  async set(settings: Settings) {
    return await this.storage.set(this.heliosSettingsKey, settings);
  }
}
