import { Component, OnInit } from '@angular/core';
import { PlayButtonAction, PlayButtonActionAndroid, PlayButtonActionIos, Settings } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'wk-play-button',
  templateUrl: './play-button.component.html',
  styleUrls: ['./play-button.component.scss']
})
export class PlayButtonComponent implements OnInit {
  settings: Settings;

  availablePlayButtonActions: PlayButtonAction[] = [];

  constructor(private settingsService: SettingsService, private platform: Platform) {}

  async ngOnInit() {
    this.settings = await this.settingsService.get();

    this.availablePlayButtonActions = [];

    const playActions = this.platform.is('ios') ? PlayButtonActionIos.slice(0) : PlayButtonActionAndroid.slice(0);

    playActions.reverse().forEach(action => {
      if (this.settings.availablePlayButtonActions.includes(action)) {
        this.availablePlayButtonActions.push(action);
      }
    });
  }

  changeDefaultPlayButtonAction(value) {
    this.settings.defaultPlayButtonAction = value;

    this.settingsService.set(this.settings);
  }
}
