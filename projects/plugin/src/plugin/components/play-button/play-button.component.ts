import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonList,
  IonListHeader,
  IonLabel,
  IonIcon,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { PlayButtonAction, Settings } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';
import { addIcons } from 'ionicons';
import { playOutline } from 'ionicons/icons';

@Component({
  selector: 'wk-play-button',
  templateUrl: './play-button.component.html',
  styleUrls: ['./play-button.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonList,
    IonListHeader,
    IonLabel,
    IonIcon,
    IonItem,
    IonSelect,
    IonSelectOption,
  ],
})
export class PlayButtonComponent implements OnInit {
  settings: Settings;

  defaultPlayButtonAction: PlayButtonAction;

  availablePlayButtonActions: PlayButtonAction[] = [];

  constructor(private settingsService: SettingsService) {
    addIcons({ playOutline });
  }

  async ngOnInit() {
    this.settings = await this.settingsService.get();
    this.defaultPlayButtonAction = this.settingsService.getSavedDefaultPlayButtonAction();

    this.availablePlayButtonActions = this.settingsService.getAllAvailablePlayButtonActions();
  }

  changeDefaultPlayButtonAction(value: PlayButtonAction) {
    this.settingsService.setDefaultPlayButtonAction(value, this.settings);

    this.settingsService.set(this.settings);
  }
}
