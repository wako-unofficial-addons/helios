import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../entities/settings';

@Component({
  selector: 'wk-quality',
  templateUrl: './quality.component.html',
  styleUrls: ['./quality.component.scss'],
})
export class QualityComponent implements OnInit {

  settings: Settings;

  constructor(private settingsService: SettingsService,) {
  }

  async ngOnInit() {

    this.settings = await this.settingsService.get();
  }

  toggleSourceQuality() {
    this.settingsService.set(this.settings);
  }
}
