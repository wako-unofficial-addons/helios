import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopoverController, IonList, IonItem, IonLabel, IonToggle, IonRadioGroup, IonListHeader, IonRadio } from '@ionic/angular/standalone';
import { SourceFilter } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';

@Component({
    templateUrl: './source-popover-filter.component.html',
    standalone: true,
    imports: [NgIf, FormsModule, IonList, IonItem, IonLabel, IonToggle, IonRadioGroup, IonListHeader, IonRadio],
})
export class SourcePopoverFilterComponent implements OnInit {
    filter: SourceFilter;

    constructor(
        public popoverController: PopoverController,
        private settingsService: SettingsService,
    ) { }

    async ngOnInit() {
        this.filter = (await this.settingsService.get()).sourceFilter;
    }

    async close() {
        this.popoverController.dismiss({
            filter: this.filter,
        });

        const settings = await this.settingsService.get();
        settings.sourceFilter = this.filter;

        await this.settingsService.set(settings);
    }
}
