import { Injectable } from '@angular/core';
import {
  PlayButtonAction,
  PlayButtonActionAndroid,
  PlayButtonActionAndroidTv,
  PlayButtonActionIos,
  Settings,
} from '../entities/settings';
import { WakoGlobal, WakoSettingsService } from '@wako-app/mobile-sdk';

@Injectable()
export class SettingsService {
  private readonly storageCategory = 'plugin.helios_settings';

  settings$ = WakoSettingsService.onChangeByCategory<Settings>(this.storageCategory);

  private settings: Settings;

  async get() {
    let settings: Settings = await WakoSettingsService.getByCategory<Settings>(this.storageCategory);

    const defaultSettings = new Settings();
    if (!settings) {
      settings = defaultSettings;
    }

    Object.keys(defaultSettings).forEach((key) => {
      if (settings[key] === undefined) {
        settings[key] = defaultSettings[key];
      }
    });

    this.settings = settings;

    return settings;
  }

  async set(settings: Settings) {
    this.settings = settings;

    return await WakoSettingsService.setByCategory(this.storageCategory, settings);
  }

  getPlayButtonActions(isDefaultAction = false) {
    const availablePlayButtonActions = this.getSavedAvailablePlayButtonActions();
    let defaultPlayButtonAction = this.settings.defaultPlayButtonAction;
    if (WakoGlobal && WakoGlobal?.isTvLayout) {
      defaultPlayButtonAction = this.settings.defaultPlayButtonActionTv;
    }

    let actions = isDefaultAction ? [defaultPlayButtonAction] : availablePlayButtonActions;

    if (actions.length === 1 && actions[0] === 'let-me-choose') {
      actions = availablePlayButtonActions;
    }

    return actions;
  }

  getAllAvailablePlayButtonActions(isIos: boolean) {
    if (WakoGlobal && WakoGlobal?.isTvLayout) {
      return PlayButtonActionAndroidTv.slice(0);
    }

    return isIos ? PlayButtonActionIos.slice(0) : PlayButtonActionAndroid.slice(0);
  }

  getSavedDefaultPlayButtonAction() {
    return WakoGlobal && WakoGlobal?.isTvLayout
      ? this.settings.defaultPlayButtonActionTv
      : this.settings.defaultPlayButtonAction;
  }

  getSavedAvailablePlayButtonActions() {
    let availablePlayButtonActions = this.settings.availablePlayButtonActions;
    if (WakoGlobal && WakoGlobal?.isTvLayout) {
      availablePlayButtonActions = this.settings.availablePlayButtonActionsTv;
      if (!availablePlayButtonActions || availablePlayButtonActions.length === 0) {
        availablePlayButtonActions = PlayButtonActionAndroidTv;
      }
    }

    return availablePlayButtonActions;
  }

  setDefaultPlayButtonAction(action: PlayButtonAction, settings: Settings) {
    if (WakoGlobal && WakoGlobal?.isTvLayout) {
      settings.defaultPlayButtonActionTv = action;
    } else {
      settings.defaultPlayButtonAction = action;
    }
  }

  setAvailablePlayButtonActions(actions: PlayButtonAction[], settings: Settings) {
    if (WakoGlobal && WakoGlobal?.isTvLayout) {
      settings.availablePlayButtonActionsTv = actions;
    } else {
      settings.availablePlayButtonActions = actions;
    }
  }
}
