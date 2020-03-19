import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Settings } from '../entities/settings';
import { Subject } from 'rxjs';

@Injectable()
export class SettingsService {
  readonly heliosSettingsKey = 'helios-settings-key';

  settings$ = new Subject<Settings>();

  constructor(private storage: Storage) {}

  async get() {
    let settings: Settings = await this.storage.get(this.heliosSettingsKey);

    const defaultSettings = new Settings();
    if (!settings) {
      settings = defaultSettings;
    }

    Object.keys(defaultSettings).forEach(key => {
      if (settings[key] === undefined) {
        settings[key] = defaultSettings[key];
      }
    });

    return settings;
  }

  async set(settings: Settings) {
    const res = await this.storage.set(this.heliosSettingsKey, settings);

    this.settings$.next(settings);

    return res;
  }
}
