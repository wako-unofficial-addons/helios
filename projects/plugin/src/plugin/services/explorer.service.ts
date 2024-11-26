import { Injectable } from '@angular/core';
import { ExplorerFile, ExplorerFolderItem, ExplorerItem } from '@wako-app/mobile-sdk';
import { forkJoin, Observable, of } from 'rxjs';
import { first, map, mapTo, switchMap } from 'rxjs/operators';
import { AllDebridMagnetStatusMagnetDto } from './all-debrid/dtos/magnet/all-debrid-magnet-status.dto';
import { AllDebridLinkUnlockForm } from './all-debrid/forms/link/all-debrid-link-unlock.form';
import { AllDebridMagnetDeleteForm } from './all-debrid/forms/magnet/all-debrid-magnet-delete.form';
import { AllDebridMagnetStatusForm } from './all-debrid/forms/magnet/all-debrid-magnet-status.form';
import { AllDebridApiService } from './all-debrid/services/all-debrid-api.service';
import { DebridAccountService } from './debrid-account.service';
import { PremiumizeFolderDeleteForm } from './premiumize/forms/folder/premiumize-folder-delete.form';
import { PremiumizeFolderListForm } from './premiumize/forms/folder/premiumize-folder-list.form';
import { PremiumizeItemDeleteForm } from './premiumize/forms/item/premiumize-item-delete.form';
import { PremiumizeApiService } from './premiumize/services/premiumize-api.service';
import { RealDebridTorrentsDeleteForm } from './real-debrid/forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridTorrentsInfoForm } from './real-debrid/forms/torrents/real-debrid-torrents-info.form';
import { RealDebridFolderListForm } from './real-debrid/forms/torrents/real-debrid-torrents-list.form';
import { RealDebridUnrestrictLinkForm } from './real-debrid/forms/unrestrict/real-debrid-unrestrict-link.form';
import { RealDebridApiService } from './real-debrid/services/real-debrid-api.service';
import { isVideoFile } from './tools';
import { TorboxTorrentListForm } from './torbox/forms/torrent/torbox-torrent-list.form';
import { TorboxApiService } from './torbox/services/torbox-api.service';
import { TorboxControlTorrentForm } from './torbox/forms/control/torbox-control-torrent.form';
import { TorboxDownloadRequestForm } from './torbox/forms/download/torbox-download-request.form';
import { TorboxTorrentItem } from './torbox/dtos/torrent/torbox-torrent-list.dto';

interface CustomDataRD {
  type: 'RD';
  link: string;
  servicePlayerUrl?: string;
}

@Injectable()
export class ExplorerService {
  constructor(private debridAccountService: DebridAccountService) {}

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
          goToParentAction: this.getFromRD(),
        };

        torrent.files.forEach((file, index) => {
          const explorerFile: ExplorerFile = {
            id: torrent.id,
            size: torrent.bytes,
            customData: {
              type: 'RD',
              link: torrent.links[index],
            },
          };

          explorerFolderItem.items.push({
            id: torrent.id,
            createdAt: null,
            label: file.path[0] === '/' ? file.path.substr(1) : file.path,
            pluginId: 'plugin.helios',
            type: 'file',
            file: explorerFile,
            fetchChildren: null,
            deleteAction: null,
          });
        });

        this.sortByNameAsc(explorerFolderItem.items);

        explorerFolderItem.title += ` (${explorerFolderItem.items.length})`;
        explorerFolderItem.label += ` (${explorerFolderItem.items.length})`;

        return explorerFolderItem;
      }),
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
          goToParentAction: null,
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
                  link,
                },
              };

              explorerFolderItem.items.push({
                id: torrent.id,
                createdAt: null,
                label: torrent.filename,
                pluginId: 'plugin.helios',
                type: 'file',
                file: file,
                fetchChildren: null,
                deleteAction: RealDebridTorrentsDeleteForm.submit(torrent.id).pipe(mapTo(true)),
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
              deleteAction: RealDebridTorrentsDeleteForm.submit(torrent.id).pipe(mapTo(true)),
            });
          }
        });

        explorerFolderItem.title += ` (${explorerFolderItem.items.length})`;
        explorerFolderItem.label += ` (${explorerFolderItem.items.length})`;

        return explorerFolderItem;
      }),
    );
  }

  private getFromAD() {
    return AllDebridMagnetStatusForm.submit(null, 'ready').pipe(
      map((data: any) => {
        const explorerFolderItem: ExplorerFolderItem = {
          isRoot: true,
          folderId: null,
          parentId: null,
          title: 'All Debrid',
          label: 'All Debrid',
          items: [],
          goToParentAction: null,
        };

        if (data.status !== 'success') {
          return explorerFolderItem;
        }

        const magnets: AllDebridMagnetStatusMagnetDto[] = [];
        if (data.data.magnets.hasOwnProperty('id')) {
          magnets.push(data.data.magnets);
        } else {
          Object.values(data.data.magnets).forEach((magnet: AllDebridMagnetStatusMagnetDto) => {
            magnets.push(magnet);
          });
        }

        magnets.forEach((magnet) => {
          magnet.links.forEach((link) => {
            if (!isVideoFile(link.filename)) {
              return;
            }
            const file: ExplorerFile = {
              id: link.link,
              size: link.size,
              customData: {
                type: 'AD',
                magnet,
                link,
              },
            };

            explorerFolderItem.items.push({
              id: link.link,
              createdAt: null,
              label: link.filename,
              pluginId: 'plugin.helios',
              type: 'file',
              file: file,
              fetchChildren: null,
              deleteAction: AllDebridMagnetDeleteForm.submit(magnet.id).pipe(mapTo(true)),
            });
          });
        });

        explorerFolderItem.title += ` (${explorerFolderItem.items.length})`;
        explorerFolderItem.label += ` (${explorerFolderItem.items.length})`;

        return explorerFolderItem;
      }),
    );
  }

  private fetchChildrenTB(parentTitle: string, torrent: TorboxTorrentItem) {
    return of(null).pipe(
      map(() => {
        const explorerFolderItem: ExplorerFolderItem = {
          isRoot: false,
          title: parentTitle,
          folderId: null,
          parentId: null,
          label: torrent.name,
          items: [],
          goToParentAction: this.getFromTB(),
        };

        torrent.files.forEach((file) => {
          const explorerFile: ExplorerFile = {
            id: torrent.id.toString(),
            size: file.size,
            customData: {
              type: 'TB',
              torrent,
              file,
            },
          };

          explorerFolderItem.items.push({
            id: `${torrent.id}_${file.id}`,
            createdAt: new Date(torrent.created_at).toISOString(),
            label: file.short_name,
            pluginId: 'plugin.helios',
            type: 'file',
            file: explorerFile,
            fetchChildren: null,
            deleteAction: null,
          });
        });

        this.sortByNameAsc(explorerFolderItem.items);

        explorerFolderItem.title += ` (${explorerFolderItem.items.length})`;
        explorerFolderItem.label += ` (${explorerFolderItem.items.length})`;

        return explorerFolderItem;
      }),
    );
  }

  private getFromTB() {
    return TorboxTorrentListForm.submit({ bypass_cache: true }).pipe(
      map((data) => {
        const explorerFolderItem: ExplorerFolderItem = {
          isRoot: true,
          folderId: null,
          parentId: null,
          title: 'Torbox',
          label: 'Torbox',
          items: [],
          goToParentAction: null,
        };

        if (!data.success || !data.data) {
          return explorerFolderItem;
        }

        data.data.forEach((torrent) => {
          if (torrent.download_state !== 'cached' && torrent.download_state !== 'completed') {
            return;
          }

          if (torrent.files.length === 1) {
            const file = torrent.files[0];
            const explorerFile: ExplorerFile = {
              id: torrent.id.toString(),
              size: file.size,
              customData: {
                type: 'TB',
                torrent,
                file,
              },
            };

            explorerFolderItem.items.push({
              id: torrent.id.toString(),
              createdAt: new Date(torrent.created_at).toISOString(),
              label: file.short_name,
              pluginId: 'plugin.helios',
              type: 'file',
              file: explorerFile,
              fetchChildren: null,
              deleteAction: TorboxControlTorrentForm.submit({
                torrent_id: torrent.id.toString(),
                operation: 'delete',
              }).pipe(mapTo(true)),
            });
          } else {
            explorerFolderItem.items.push({
              id: torrent.id.toString(),
              createdAt: new Date(torrent.created_at).toISOString(),
              label: torrent.name,
              pluginId: 'plugin.helios',
              type: 'folder',
              fetchChildren: this.fetchChildrenTB(torrent.name, torrent),
              deleteAction: TorboxControlTorrentForm.submit({
                torrent_id: torrent.id.toString(),
                operation: 'delete',
              }).pipe(mapTo(true)),
            });
          }
        });

        explorerFolderItem.title += ` (${explorerFolderItem.items.length})`;
        explorerFolderItem.label += ` (${explorerFolderItem.items.length})`;

        return explorerFolderItem;
      }),
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
        if (RealDebridApiService.getToken()) {
          obss.push(this.getFromRD());
        }
        if (AllDebridApiService.hasApiKey()) {
          obss.push(this.getFromAD());
        }
        if (TorboxApiService.hasApiKey()) {
          obss.push(this.getFromTB());
        }

        return forkJoin(obss);
      }),
    );
  }

  async getLinkFromFile(file: ExplorerFile) {
    const customData: any = file.customData;
    if (customData.type === 'RD') {
      return this.getLinkFromFileRD(file);
    }
    if (customData.type === 'AD') {
      return this.getLinkFromFileAD(file);
    }
    if (customData.type === 'TB') {
      return this.getLinkFromFileTB(file);
    }
    return null;
  }

  async getLinkFromFileRD(file: ExplorerFile) {
    const customData: CustomDataRD = file.customData;

    const unrestrictedLink = await RealDebridUnrestrictLinkForm.submit(customData.link).toPromise();

    file.customData.servicePlayerUrl = `https://real-debrid.com/streaming-${unrestrictedLink.id}`;

    return unrestrictedLink.download;
  }

  async getLinkFromFileAD(file: ExplorerFile) {
    const customData: CustomDataRD = file.customData;

    const unrestrictedLink = await AllDebridLinkUnlockForm.submit(customData.link.link as any).toPromise();

    return unrestrictedLink.data.link;
  }

  async getLinkFromFileTB(file: ExplorerFile) {
    const customData: any = file.customData;
    const torrent = customData.torrent;
    const torrentFile = customData.file;

    const response = await TorboxDownloadRequestForm.submit({
      torrent_id: torrent.id.toString(),
      file_id: torrentFile.id.toString(),
      zip_link: false,
    }).toPromise();

    return response.data;
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
          goToParentAction: data.name === 'root' ? null : this.getFromPM(data.parent_id),
        };
        data.content.forEach((item) => {
          if (item.type === 'file' && !item.stream_link && !item.link) {
            return;
          }

          let file: ExplorerFile = null;
          if (item.type === 'file') {
            file = {
              id: item.id,
              size: item.size,
              link: item.link,
              streamLink: item.stream_link,
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
            deleteAction:
              item.type === 'folder' ? this.deleteFolderFromPMById(item.id) : this.deleteFileFromPMById(item.id),
          });
        });

        explorerFolderItem.title += ` (${explorerFolderItem.items.length})`;
        explorerFolderItem.label += ` (${explorerFolderItem.items.length})`;

        return explorerFolderItem;
      }),
    );
  }

  private deleteFolderFromPMById(id: string) {
    return PremiumizeFolderDeleteForm.submit(id).pipe(map(() => true));
  }

  private deleteFileFromPMById(id: string) {
    return PremiumizeItemDeleteForm.submit(id).pipe(map(() => true));
  }
}
