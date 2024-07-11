import { NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FileSizeFilter, Settings } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';
import { addIcons } from "ionicons";
import { funnelOutline } from "ionicons/icons";
import { IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonToggle, IonInput } from "@ionic/angular/standalone";

@Component({
    selector: 'wk-file-size-filter',
    templateUrl: './file-size-filter.component.html',
    styleUrls: ['./file-size-filter.component.scss'],
    standalone: true,
    imports: [NgIf, FormsModule, TranslateModule, IonList, IonListHeader, IonLabel, IonIcon, IonItem, IonToggle, IonInput],
})
export class FileSizeFilterComponent implements OnInit {
    @Input() category: 'Movie' | 'TV Show' = 'Movie';

    settings: Settings;

    filter: FileSizeFilter;

    constructor(private settingsService: SettingsService) {
        addIcons({ funnelOutline });
    }

    async ngOnInit() {
        this.settings = await this.settingsService.get();

        if (this.category === 'Movie') {
            this.filter = this.settings.fileSizeFilteringMovie;
        } else {
            this.filter = this.settings.fileSizeFilteringTv;
        }
    }

    setSettings() {
        this.settingsService.set(this.settings);
    }
}
