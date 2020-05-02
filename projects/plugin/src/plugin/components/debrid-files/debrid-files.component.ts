import { Component, OnInit, NgZone } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { OpenSourceService } from '../../services/open-source.service';
import { StreamLinkSource, StreamLink } from '../../entities/stream-link-source';
import { SourceQuery } from '../../entities/source-query';

import { PremiumizeFolderListForm } from '../../services/premiumize/forms/folder/premiumize-folder-list.form';

import { RealDebridFolderListForm } from '../../services/real-debrid/forms/torrents/real-debrid-torrents-list.form';
import { RealDebridTorrentsInfoForm } from '../../services/real-debrid/forms/torrents/real-debrid-torrents-info.form';
import { RealDebridUnrestrictLinkForm } from '../../services/real-debrid/forms/unrestrict/real-debrid-unrestrict-link.form';
import { RealDebridTorrentsDeleteForm } from '../../services/real-debrid/forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridStreamingTranscodeForm } from '../../services/real-debrid/forms/streaming/real-debrid-streaming-transcode.form';

@Component({
  selector: 'wk-debrid-files',
  templateUrl: './debrid-files.component.html',
  styleUrls: ['./debrid-files.component.scss']
})
export class DebridFilesComponent implements OnInit {
  public init;
  public responsePM;
  public responseRD;

  constructor(
    private ngZone: NgZone,
    private openSourceService: OpenSourceService,
    private alertController: AlertController,
    private translateService: TranslateService
  ) {}

  ngOnInit() {
    this.listAll('', 'init');
  }

  public async listAll(folderID, debrid?) {
    if (debrid == 'pm') {
      this.init = false;
      this.responseRD = null;
      this.responsePM = await PremiumizeFolderListForm.submit(folderID).toPromise();
    } else if (debrid == 'rd') {
      this.init = false;
      this.responsePM = null;
      this.listAllRD(folderID);
    } else if (debrid == 'init') {
      this.init = true;
      this.responsePM = await PremiumizeFolderListForm.submit(folderID).toPromise();
      this.listAllRD(folderID);
    }
  }

  public async listAllRD(folderID) {
    let listContent;

    if (folderID == '') {
      listContent = await RealDebridFolderListForm.submit().toPromise();
      this.responseRD = { item: false, content: listContent };
    } else {
      listContent = await RealDebridTorrentsInfoForm.submit(folderID).toPromise();
      this.responseRD = {
        item: true,
        content: [listContent]
      };
    }
  }

  public openLink(item, debrid?) {
    const sourceQuery = { category: 'movie' } as SourceQuery;

    let streamLinkSource;
    if (debrid == 'rd') {
      streamLinkSource = new StreamLinkSource(item.id, item.name, item.size, 'other', 'cached_torrent', false, 'RD', 'RD', item.link);
    } else {
      streamLinkSource = new StreamLinkSource(item.id, item.name, item.size, 'other', 'cached_torrent', false, 'PM', 'PM', item.link);
    }

    const streamLink = new StreamLink(item.name, item.link, item.name, true, item.stream_link);

    streamLinkSource.streamLinks = [streamLink];

    this.openSourceService.openStreamLinkSource(streamLinkSource, sourceQuery);
  }

  public async unrestrictLink(item) {
    let unrestrictedLink = await RealDebridUnrestrictLinkForm.submit(item).toPromise();
    item = {
      id: unrestrictedLink.id,
      name: unrestrictedLink.filename,
      size: unrestrictedLink.filesize,
      link: unrestrictedLink.download,
      stream_link: unrestrictedLink.download
    };
    this.openLink(item, 'rd');
  }

  async removeItemAlert(itemId, itemName, folderId, debrid) {
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
            if (debrid == 'pm') {
              await PremiumizeFolderListForm.remove(itemId).toPromise();
              this.ngZone.run(() => {
                this.listAll(folderId);
              });
            } else if (debrid == 'rd') {
              await RealDebridTorrentsDeleteForm.submit(itemId).toPromise();
              this.ngZone.run(() => {
                this.listAll(folderId);
              });
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
