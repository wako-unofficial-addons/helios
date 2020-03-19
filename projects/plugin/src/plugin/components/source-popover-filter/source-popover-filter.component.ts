import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { SourceFilter } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';

@Component({
  templateUrl: './source-popover-filter.component.html'
})
export class SourcePopoverFilterComponent implements OnInit {
  filter: SourceFilter;

  constructor(public popoverController: PopoverController, private settingsService: SettingsService) {}

  async ngOnInit() {
    this.filter = (await this.settingsService.get()).sourceFilter;
  }

  async close() {
    this.popoverController.dismiss({
      filter: this.filter
    });

    const settings = await this.settingsService.get();
    settings.sourceFilter = this.filter;

    await this.settingsService.set(settings);
  }
}
