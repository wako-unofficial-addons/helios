import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

import { OpenSourceService } from '../../services/open-source.service';
import { PremiumizeFolderListForm } from '../../services/premiumize/forms/folder/premiumize-folder-list.form';

@Component({
  selector: 'wk-debrid-files',
  templateUrl: './debrid-files.component.html',
  styleUrls: ['./debrid-files.component.scss']
})
export class DebridFilesComponent implements OnInit {
  public response;

  constructor(private openSourceService: OpenSourceService, private alertController: AlertController) {}

  ngOnInit() {
    this.listAll('');
  }

  public async listAll(folderID) {
    this.response = await PremiumizeFolderListForm.submit(folderID).toPromise();
  }

  public openLink(link) {
    //this.openSourceService.openStreamLinkSource(link);
  }

  async removeItemAlert(itemId, itemName) {
    const alert = await this.alertController.create({
      header: 'Are you sure you want to delete the following?',
      message: itemName,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        },
        {
          text: 'Remove',
          handler: async () => {
            await PremiumizeFolderListForm.remove(itemId).toPromise();
          }
        }
      ]
    });

    await alert.present();
  }
}
