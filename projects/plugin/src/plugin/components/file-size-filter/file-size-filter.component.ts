import { Component, Input, OnInit } from '@angular/core';
import { FileSizeFilter, Settings } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'wk-file-size-filter',
  templateUrl: './file-size-filter.component.html',
  styleUrls: ['./file-size-filter.component.scss']
})
export class FileSizeFilterComponent implements OnInit {
  @Input() category: 'Movie' | 'TV Show' = 'Movie';

  settings: Settings;

  filter: FileSizeFilter;

  constructor(private settingsService: SettingsService) {
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
