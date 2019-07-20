import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { logData } from '../services/tools';
import { ModalController } from '@ionic/angular';
import { ProvidersComponent } from './providers/providers.component';
import { CloudAccountListComponent } from './cloud-account/cloud-account-list/cloud-account-list.component';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  constructor(private translate: TranslateService, private modalCtrl: ModalController) {}

  ngOnInit() {
    logData('Current lang', this.translate.currentLang);
    logData('Test instant translate', this.translate.instant('settings.title'));
  }

  async openProviders() {
    const modal = await this.modalCtrl.create({
      component: ProvidersComponent
    });

    modal.present();
  }

  async openCloudAccount() {
    const modal = await this.modalCtrl.create({
      component: CloudAccountListComponent
    });

    modal.present();
  }
}
