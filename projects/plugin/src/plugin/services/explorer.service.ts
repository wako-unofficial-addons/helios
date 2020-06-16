import { Injectable } from '@angular/core';
import { first, map, mapTo, switchMap } from 'rxjs/operators';
import { SettingsService } from './settings.service';
import { DebridAccountService } from './debrid-account.service';
import { RealDebridFolderListForm } from './real-debrid/forms/torrents/real-debrid-torrents-list.form';
import { ExplorerFile, ExplorerFolderItem, ExplorerItem } from '@wako-app/mobile-sdk';
import { RealDebridTorrentsInfoForm } from './real-debrid/forms/torrents/real-debrid-torrents-info.form';
import { RealDebridTorrentsDeleteForm } from './real-debrid/forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridUnrestrictLinkForm } from './real-debrid/forms/unrestrict/real-debrid-unrestrict-link.form';
import { PremiumizeFolderListForm } from './premiumize/forms/folder/premiumize-folder-list.form';
import { PremiumizeFolderDeleteForm } from './premiumize/forms/folder/premiumize-folder-delete.form';
import { PremiumizeItemDeleteForm } from './premiumize/forms/item/premiumize-item-delete.form';
import { forkJoin, Observable } from 'rxjs';
import { PremiumizeApiService } from './premiumize/services/premiumize-api.service';
import { RealDebridApiService } from './real-debrid/services/real-debrid-api.service';

interface CustomDataRD {
  type: 'RD';
  link: string;
  servicePlayerUrl?: string;
}

@Injectable()
export class ExplorerService {
  constructor(private settingsService: SettingsService, private debridAccountService: DebridAccountService) {}

  private sortByNameAsc(files: ExplorerItem[]) {
    files.sort((stream1, stream2) => {
      if (stream1.label === stream2.label) {
        return 0;
      }

      return stream1.label > stream2.label ? 1 : -1;
    });
  }

  private fetchChildrenRD(parentTitle: string, id: string) {
    return RealDebridTorrentsInfoForm.submit(id).pipe(
      map((torrent) => {
        const explorerFolderItem: ExplorerFolderItem = {
          isRoot: false,
          title: parentTitle,
          folderId: null,
          parentId: null,
          label: torrent.filename,
          items: [],
          goToParentAction: this.getFromRD()
        };

        torrent.files.forEach((file, index) => {
          const explorerFile: ExplorerFile = {
            id: torrent.id,
            size: torrent.bytes,
            customData: {
              type: 'RD',
              link: torrent.links[index]
            }
          };

          explorerFolderItem.items.push({
            id: torrent.id,
            createdAt: null,
            label: file.path,
            pluginId: 'plugin.helios',
            type: 'file',
            file: explorerFile,
            fetchChildren: null,
            deleteAction: null
          });
        });

        this.sortByNameAsc(explorerFolderItem.items);

        return explorerFolderItem;
      })
    );
  }

  private getFromRD() {
    return RealDebridFolderListForm.submit().pipe(
      map((torrents) => {
        const explorerFolderItem: ExplorerFolderItem = {
          isRoot: true,
          folderId: null,
          parentId: null,
          title: 'Real Debrid',
          label: 'Real Debrid',
          items: [],
          goToParentAction: null
        };

        torrents.forEach((torrent) => {
          if (torrent.progress !== 100) {
            return;
          }

          if (torrent.links.length === 1) {
            torrent.links.forEach((link) => {
              const file: ExplorerFile = {
                id: torrent.id,
                size: torrent.bytes,
                customData: {
                  type: 'RD',
                  link
                }
              };

              explorerFolderItem.items.push({
                id: torrent.id,
                createdAt: null,
                label: torrent.filename,
                pluginId: 'plugin.helios',
                type: 'file',
                file: file,
                fetchChildren: null,
                deleteAction: RealDebridTorrentsDeleteForm.submit(torrent.id).pipe(mapTo(true))
              });
            });
          } else {
            explorerFolderItem.items.push({
              id: torrent.id,
              createdAt: null,
              label: torrent.filename,
              pluginId: 'plugin.helios',
              type: 'folder',
              fetchChildren: this.fetchChildrenRD(torrent.filename, torrent.id),
              deleteAction: RealDebridTorrentsDeleteForm.submit(torrent.id).pipe(mapTo(true))
            });
          }
        });

        return explorerFolderItem;
      })
    );
  }

  get() {
    return this.debridAccountService.ready$.pipe(
      first(),
      switchMap(() => {
        const obss: Observable<ExplorerFolderItem>[] = [];

        if (PremiumizeApiService.hasApiKey()) {
          obss.push(this.getFromPM());
        }
        if (!!RealDebridApiService.getToken()) {
          obss.push(this.getFromRD());
        }

        return forkJoin(obss);
      })
    );
  }

  async getLinkRD(file: ExplorerFile) {
    const customData: CustomDataRD = file.customData;
    if (customData.type !== 'RD') {
      return null;
    }

    const unrestrictedLink = await RealDebridUnrestrictLinkForm.submit(customData.link).toPromise();

    file.customData.servicePlayerUrl = `https://real-debrid.com/streaming-${unrestrictedLink.id}`;

    return unrestrictedLink.download;
  }

  getFromPM(folderId?: string) {
    return PremiumizeFolderListForm.submit(folderId).pipe(
      map((data) => {
        if (data.status === 'error') {
          throw new Error(data.message ?? JSON.stringify(data));
        }

        const explorerFolderItem: ExplorerFolderItem = {
          isRoot: data.name === 'root',
          title: data.name === 'root' ? 'Premiumize' : data.name,
          folderId: data.folder_id,
          parentId: data.parent_id,
          label: data.name,
          items: [],
          goToParentAction: data.name === 'root' ? null : this.getFromPM(data.parent_id)
        };
        data.content.forEach((item) => {
          if (item.type === 'file' && !item.stream_link) {
            return;
          }

          let file: ExplorerFile = null;
          if (item.type === 'file') {
            file = {
              id: item.id,
              size: item.size,
              link: item.link,
              streamLink: item.stream_link
            };
          }

          explorerFolderItem.items.push({
            id: item.id,
            createdAt: null,
            label: item.name,
            pluginId: 'plugin.helios',
            type: item.type,
            file: file,
            fetchChildren: item.type === 'folder' ? this.getFromPM(item.id) : null,
            deleteAction: item.type === 'folder' ? this.deleteFolderFromPMById(item.id) : this.deleteFileFromPMById(item.id)
          });
        });

        return explorerFolderItem;
      })
    );
  }

  private deleteFolderFromPMById(id: string) {
    return PremiumizeFolderDeleteForm.submit(id).pipe(map(() => true));
  }

  private deleteFileFromPMById(id: string) {
    return PremiumizeItemDeleteForm.submit(id).pipe(map(() => true));
  }
}
