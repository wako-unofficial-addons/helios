import { Component, OnInit, NgZone } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import { OpenSourceService } from '../../services/open-source.service';
import { PremiumizeFolderListForm } from '../../services/premiumize/forms/folder/premiumize-folder-list.form';
import { StreamLinkSource, StreamLink } from '../../entities/stream-link-source';
import { SourceQuery } from '../../entities/source-query';

@Component({
  selector: 'wk-debrid-files',
  templateUrl: './debrid-files.component.html',
  styleUrls: ['./debrid-files.component.scss']
})
export class DebridFilesComponent implements OnInit {
  public response;

  constructor(
    private ngZone: NgZone,
    private openSourceService: OpenSourceService,
    private alertController: AlertController,
    private translateService: TranslateService
  ) {}

  ngOnInit() {
    this.listAll('');
  }

  public async listAll(folderID) {
    this.response = await PremiumizeFolderListForm.submit(folderID).toPromise();
  }

  public openLink(item) {
    const sourceQuery = { category: 'movie' } as SourceQuery;

    const streamLinkSource = new StreamLinkSource(item.id, item.name, item.size, 'other', 'cached_torrent', false, 'PM', 'PM', item.link);
    const streamLink = new StreamLink(item.name, item.link, item.name, true, item.stream_link);

    streamLinkSource.streamLinks = [streamLink];

    this.openSourceService.openStreamLinkSource(streamLinkSource, sourceQuery);
  }

  async removeItemAlert(itemId, itemName, folderId) {
    const alert = await this.alertController.create({
      header: this.translateService.instant('alerts.removeAlert'),
      message: itemName,
      buttons: [
        {
          text: this.translateService.instant('alerts.cancelButton'),
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        },
        {
          text: this.translateService.instant('alerts.removeButton'),
          handler: async () => {
            await PremiumizeFolderListForm.remove(itemId).toPromise();
            this.ngZone.run(() => {
              this.listAll(folderId);
            });
          }
        }
      ]
    });

    await alert.present();
  }
}
