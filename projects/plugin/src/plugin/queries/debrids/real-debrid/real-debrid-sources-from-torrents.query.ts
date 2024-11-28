import { from, Observable, of, throwError } from 'rxjs';
import { RealDebridTorrentsInstantAvailabilityForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-instant-availability.form';
import { catchError, finalize, map, retry, switchMap } from 'rxjs/operators';
import { SourceQuery } from '../../../entities/source-query';
import { getHashFromUrl, isEpisodeCodeMatchesFileName, isVideoFile } from '../../../services/tools';
import { RealDebridApiService } from '../../../services/real-debrid/services/real-debrid-api.service';
import { TorrentSource } from '../../../entities/torrent-source';
import { StreamLinkSource } from '../../../entities/stream-link-source';
import { RealDebridUnrestrictLinkDto } from '../../../services/real-debrid/dtos/unrestrict/real-debrid-unrestrict-link.dto';
import { RealDebridGetCachedUrlQuery } from './real-debrid-get-cached-url.query';
import { ActionSheetController, LoadingController } from '@ionic/angular/standalone';
import { RealDebridTorrentsAddMagnetForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-add-magnet.form';
import { RealDebridTorrentsInfoForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-info.form';
import { RealDebridTorrentsDeleteForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridTorrentsSelectFilesForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-select-files.form';
import { RealDebridTorrentsAddMagnetDto } from '../../../services/real-debrid/dtos/torrents/real-debrid-torrents-add-magnet.dto';

export class RealDebridSourcesFromTorrentsQuery {
  private static hasRealDebrid() {
    return !!RealDebridApiService.getToken();
  }

  private static getSizeStr(size: number): string {
    let res = size;
    let unit = 'B';

    if (size >= 1099511627776) {
      res = size / 1099511627776;
      unit = 'TB';
    } else if (size >= 1073741824) {
      res = size / 1073741824;
      unit = 'GB';
    } else if (size >= 1048576) {
      res = size / 1048576;
      unit = 'MB';
    } else if (size >= 1024) {
      res = size / 1024;
      unit = 'KB';
    }

    return Math.round(res * 100) / 100 + ' ' + unit;
  }

  private static setHash(torrent: TorrentSource) {
    let hash = torrent.hash;

    if (!hash) {
      hash = getHashFromUrl(torrent.url);
    }
    if (hash && !torrent.hash) {
      torrent.hash = hash;
    }
  }

  private static getAllHash(torrents: TorrentSource[]) {
    const allHashes = [];
    torrents.forEach((torrent) => {
      this.setHash(torrent);

      if (torrent.hash && !allHashes.includes(torrent.hash)) {
        allHashes.push(torrent.hash);
      }
    });
    return allHashes;
  }

  private static sourceIsCached({
    debridSource,
    sourceQuery,
  }: {
    debridSource: StreamLinkSource;
    sourceQuery: SourceQuery;
  }) {
    const unrestrictLinks: RealDebridUnrestrictLinkDto[] = [];

    const loader = new LoadingController();
    let displayedLoader: HTMLIonLoadingElement = null;

    let magnetResponse: RealDebridTorrentsAddMagnetDto = null;
    return from(
      loader
        .create({
          spinner: 'crescent',
          backdropDismiss: true,
          htmlAttributes: {
            style: 'background-color: black;',
          },
        })
        .then((l) => {
          displayedLoader = l;
          displayedLoader.present();
        }),
    ).pipe(
      finalize(() => {
        if (displayedLoader) {
          displayedLoader.dismiss();
        }
        if (magnetResponse) {
          debugger;
          RealDebridTorrentsDeleteForm.submit(magnetResponse.id).subscribe();
        }
      }),

      switchMap(() => RealDebridTorrentsAddMagnetForm.submit(debridSource.originalUrl)),
      switchMap((addMagnetResponse) => {
        magnetResponse = addMagnetResponse;
        return RealDebridTorrentsInfoForm.submit(addMagnetResponse.id);
      }),
      switchMap((info) => {
        if (info.files.length === 0) {
          RealDebridTorrentsDeleteForm.submit(magnetResponse.id).subscribe();

          return throwError(() => new Error('Cannot add this source: ' + info.status));
        }

        return RealDebridTorrentsSelectFilesForm.submit(info.id, 'all').pipe(retry(2));
      }),
      switchMap((selectFilesResponse) => {
        return RealDebridTorrentsInfoForm.submit(magnetResponse.id);
      }),
      switchMap((info) => {
        if (info.status !== 'downloaded') {
          RealDebridTorrentsDeleteForm.submit(magnetResponse.id).subscribe();

          return throwError(() => new Error('This source is not cached.'));
        }

        const fileIds: string[] = [];

        let episodeCode = null;
        if (sourceQuery.episode) {
          episodeCode =
            sourceQuery.category === 'anime'
              ? sourceQuery.episode.absoluteNumber.toString()
              : sourceQuery.episode.episodeCode;
        }
        for (const file of info.files) {
          let match = false;
          if (sourceQuery.episode) {
            if (sourceQuery.category === 'anime') {
              match = file.path.match(sourceQuery.episode.title) !== null && file.path.match(episodeCode) !== null;
            } else {
              match = isEpisodeCodeMatchesFileName(episodeCode, file.path);
            }
            if (isVideoFile(file.path) && match) {
              fileIds.push(file.id.toString());
              break;
            }
          } else if (isVideoFile(file.path)) {
            fileIds.push(file.id.toString());
          }
        }
        RealDebridTorrentsDeleteForm.submit(magnetResponse.id).subscribe();

        return RealDebridGetCachedUrlQuery.getData(debridSource.originalUrl, fileIds);
      }),
      switchMap((links) => {
        if (sourceQuery.movie && links.length === 1) {
          const link = links.slice(0).pop();

          const ext = '.' + link.filename.split('.').pop().toLowerCase();

          if (!isVideoFile(link.filename) || ext === '.rar') {
            // try to get all files
            return RealDebridGetCachedUrlQuery.getData(debridSource.originalUrl, []);
          }
        }
        return of(links);
      }),

      catchError((err) => {
        console.error('Error checking RD cache:', err);
        return of(unrestrictLinks);
      }),
    );
  }

  static getData(torrents: TorrentSource[], sourceQuery: SourceQuery) {
    const streamLinkSources: StreamLinkSource[] = [];

    if (torrents.length === 0 || !this.hasRealDebrid()) {
      return of(streamLinkSources);
    }

    return of(
      torrents.map((torrent) => {
        const debridSource = new StreamLinkSource(
          'RD-' + torrent.hash,
          torrent.title,
          torrent.size,
          torrent.quality,
          'unchecked_cached_torrent',
          torrent.isPackage,
          'RD',
          torrent.provider,
          torrent.url,
          torrent.hash,
        );

        debridSource.realDebridLinks = new Observable<RealDebridUnrestrictLinkDto[]>((observer) => {
          RealDebridSourcesFromTorrentsQuery.sourceIsCached({
            debridSource,
            sourceQuery,
          }).subscribe((links) => {
            observer.next(links);
            observer.complete();
          });
        });

        return debridSource;
      }),
    );
  }

  // static getDataOld(torrents: TorrentSource[], sourceQuery: SourceQuery) {
  //   const streamLinkSources: StreamLinkSource[] = [];

  //   if (torrents.length === 0 || !this.hasRealDebrid()) {
  //     return of(streamLinkSources);
  //   }
  //   const allHashes = this.getAllHash(torrents);

  //   return RealDebridTorrentsInstantAvailabilityForm.submit(allHashes).pipe(
  //     map((realDebridTorrentsInstantAvailabilityDto) => {
  //       torrents.forEach((torrent) => {
  //         this.setHash(torrent);

  //         if (!torrent.hash) {
  //           return;
  //         }
  //         const data = realDebridTorrentsInstantAvailabilityDto[torrent.hash.toLowerCase()];
  //         if (!data || !data.rd || data.rd.length === 0) {
  //           return;
  //         }

  //         // Take the group with the most video files
  //         let groupIndex = sourceQuery.query ? null : 0;
  //         let matchFiles = new Map<string, number>();

  //         if (sourceQuery.episode) {
  //           const groupWithFile = [];

  //           let firstVideoFileIndex = null;

  //           const episodeCode =
  //             sourceQuery.category === 'anime'
  //               ? sourceQuery.episode.absoluteNumber.toString()
  //               : sourceQuery.episode.episodeCode;

  //           let episodeFound = false;

  //           data.rd.forEach((rd, index) => {
  //             Object.keys(rd).forEach((key) => {
  //               const file = rd[key];

  //               if (!firstVideoFileIndex && isVideoFile(file.filename)) {
  //                 firstVideoFileIndex = index;
  //               }

  //               let match = false;
  //               if (sourceQuery.category === 'anime') {
  //                 match =
  //                   file.filename.match(sourceQuery.episode.title) !== null &&
  //                   file.filename.match(episodeCode) !== null;
  //               } else {
  //                 match = isEpisodeCodeMatchesFileName(episodeCode, file.filename);
  //               }

  //               if (isVideoFile(file.filename) && match && !groupWithFile.includes(index)) {
  //                 groupWithFile.push(index);
  //                 episodeFound = true;
  //                 matchFiles.set(file.filename, index);
  //               }
  //             });
  //           });

  //           if (!episodeFound) {
  //             return;
  //           }

  //           if (groupWithFile.length > 0) {
  //             groupIndex = groupWithFile.shift();
  //           } else if (firstVideoFileIndex !== null) {
  //             groupIndex = firstVideoFileIndex;
  //           }
  //         }

  //         if (sourceQuery.query && Object.keys(data.rd).length < 2) {
  //           groupIndex = 0;
  //         }

  //         torrent.isCached = true;
  //         torrent.cachedService = 'RD';

  //         const debridSource = new StreamLinkSource(
  //           'RD-' + torrent.hash,
  //           torrent.title,
  //           torrent.size,
  //           torrent.quality,
  //           'cached_torrent',
  //           torrent.isPackage,
  //           'RD',
  //           torrent.provider,
  //           torrent.url,
  //           torrent.hash,
  //         );

  //         debridSource.realDebridLinks = new Observable<RealDebridUnrestrictLinkDto[]>((observer) => {
  //           // That's ugly, but simplest way to get the loader that will be open in openSourceService.getStreamLinksWithLoader()
  //           const loader = new LoadingController();

  //           if (groupIndex !== null) {
  //             const fileIds = Object.getOwnPropertyNames(data.rd[groupIndex]);

  //             RealDebridGetCachedUrlQuery.getData(torrent.url, fileIds)
  //               .pipe(finalize(() => loader.dismiss()))
  //               .subscribe(
  //                 async (links) => {
  //                   if (matchFiles.size > 1) {
  //                     const buttons = [];
  //                     matchFiles.forEach((index, filename) => {
  //                       buttons.push({
  //                         text: filename,
  //                         handler: () => {
  //                           const newLinks = [];
  //                           links.forEach((link) => {
  //                             if (link.filename === filename) {
  //                               newLinks.push(link);
  //                             }
  //                           });

  //                           observer.next(newLinks);
  //                           observer.complete();
  //                         },
  //                       });
  //                     });

  //                     buttons.push({
  //                       text: 'Cancel',
  //                       icon: 'close',
  //                       role: 'cancel',
  //                       handler: () => {
  //                         console.log('Cancel clicked');
  //                       },
  //                     });

  //                     const action = new ActionSheetController();
  //                     const a = await action.create({
  //                       header: 'Select a file',
  //                       buttons,
  //                     });
  //                     a.present();

  //                     return;
  //                   }

  //                   observer.next(links);
  //                   observer.complete();
  //                 },
  //                 (err) => {
  //                   observer.error(err);
  //                 },
  //               );
  //             return;
  //           }

  //           const buttons = [];

  //           data.rd.forEach((rd, index) => {
  //             Object.keys(rd).forEach((key) => {
  //               const file = rd[key];

  //               if (!file.filename || !isVideoFile(file.filename)) {
  //                 return;
  //               }

  //               const filename = file.filename + ' - ' + this.getSizeStr(file.filesize);

  //               buttons.push({
  //                 text: filename,
  //                 handler: () => {
  //                   let loader2;
  //                   loader
  //                     .create({
  //                       spinner: 'crescent',
  //                       backdropDismiss: true,
  //                     })
  //                     .then((l) => {
  //                       loader2 = l;
  //                       loader2.present();
  //                     });

  //                   const fileIds = Object.getOwnPropertyNames(data.rd[index]);
  //                   RealDebridGetCachedUrlQuery.getData(torrent.url, fileIds)
  //                     .pipe(finalize(() => loader2.dismiss()))
  //                     .subscribe(
  //                       (links) => {
  //                         let foundLink = null;
  //                         for (const link of links) {
  //                           if (link.filename === file.filename && link.filesize === file.filesize) {
  //                             foundLink = link;
  //                           }
  //                         }

  //                         observer.next(foundLink ? [foundLink] : links);
  //                         observer.complete();
  //                       },
  //                       (err) => {
  //                         observer.error(err);
  //                       },
  //                     );
  //                 },
  //               });
  //             });
  //           });

  //           buttons.push({
  //             text: 'Cancel',
  //             icon: 'close',
  //             role: 'cancel',
  //             handler: () => {
  //               console.log('Cancel clicked');
  //             },
  //           });

  //           const action = new ActionSheetController();
  //           action
  //             .create({
  //               header: 'Select a file',
  //               buttons,
  //             })
  //             .then((a) => {
  //               a.present();

  //               loader.dismiss();
  //             });
  //         }).pipe(
  //           switchMap((links) => {
  //             if (sourceQuery.movie && links.length === 1) {
  //               const link = links.slice(0).pop();

  //               const ext = '.' + link.filename.split('.').pop().toLowerCase();

  //               if (!isVideoFile(link.filename) || ext === '.rar') {
  //                 // try to get all files
  //                 return RealDebridGetCachedUrlQuery.getData(torrent.url, []);
  //               }
  //             }
  //             return of(links);
  //           }),
  //         );

  //         streamLinkSources.push(debridSource);
  //       });

  //       return streamLinkSources;
  //     }),
  //     catchError((err) => {
  //       console.log('RD err', err);
  //       return of(streamLinkSources);
  //     }),
  //   );
  // }
}
