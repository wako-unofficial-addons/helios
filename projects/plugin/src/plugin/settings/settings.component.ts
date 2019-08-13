import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController } from '@ionic/angular';
import { ProvidersComponent } from './providers/providers.component';
import { CloudAccountListComponent } from './cloud-account/cloud-account-list/cloud-account-list.component';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  constructor(private translate: TranslateService, private modalCtrl: ModalController) {
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
