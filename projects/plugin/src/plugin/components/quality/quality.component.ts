import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Settings } from '../../entities/settings';
import { SettingsService } from '../../services/settings.service';
import { IonList, IonListHeader, IonLabel, IonItem, IonToggle } from '@ionic/angular/standalone';

@Component({
  selector: 'wk-quality',
  templateUrl: './quality.component.html',
  styleUrls: ['./quality.component.scss'],
  imports: [FormsModule, TranslateModule, IonList, IonListHeader, IonLabel, IonItem, IonToggle],
})
export class QualityComponent implements OnInit {
  settings: Settings;

  constructor(private settingsService: SettingsService) {}

  async ngOnInit() {
    this.settings = await this.settingsService.get();
  }

  toggleSourceQuality() {
    this.settingsService.set(this.settings);
  }
}
