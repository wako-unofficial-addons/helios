import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Platform, IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { PlayButtonAction, PlayButtonActionAndroid, PlayButtonActionIos, Settings } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';
import { addIcons } from "ionicons";
import { playOutline } from "ionicons/icons";

@Component({
    selector: 'wk-play-button',
    templateUrl: './play-button.component.html',
    styleUrls: ['./play-button.component.scss'],
    standalone: true,
    imports: [NgIf, FormsModule, NgFor, TranslateModule, IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonSelect, IonSelectOption],
})
export class PlayButtonComponent implements OnInit {
    settings: Settings;

    availablePlayButtonActions: PlayButtonAction[] = [];

    constructor(
        private settingsService: SettingsService,
        private platform: Platform,
    ) {
        addIcons({ playOutline });
    }

    async ngOnInit() {
        this.settings = await this.settingsService.get();

        this.availablePlayButtonActions = [];

        const playActions = this.platform.is('ios') ? PlayButtonActionIos.slice(0) : PlayButtonActionAndroid.slice(0);

        playActions.reverse().forEach((action) => {
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
