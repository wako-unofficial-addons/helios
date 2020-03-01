import { forkJoin, from, Observable, of, throwError } from 'rxjs';
import { RealDebridUnrestrictLinkDto } from '../../../services/real-debrid/dtos/unrestrict/real-debrid-unrestrict-link.dto';
import { finalize, map, mapTo, switchMap } from 'rxjs/operators';
import { RealDebridTorrentsAddMagnetForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-add-magnet.form';
import { RealDebridTorrentsSelectFilesForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-select-files.form';
import { RealDebridTorrentsDeleteForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridTorrentsInfoForm } from '../../../services/real-debrid/forms/torrents/real-debrid-torrents-info.form';
import { RealDebridUnrestrictLinkForm } from '../../../services/real-debrid/forms/unrestrict/real-debrid-unrestrict-link.form';
import { RealDebridTorrentsAddMagnetDto } from '../../../services/real-debrid/dtos/torrents/real-debrid-torrents-add-magnet.dto';
import { HeliosCacheService } from '../../../services/provider-cache.service';

export class RealDebridGetCachedUrlQuery {
  static getData(url: string, fileId: string, isPackage: boolean): Observable<RealDebridUnrestrictLinkDto[]> {
    const cacheKey = 'setCachedLinksRD_' + url + fileId;

    return HeliosCacheService.get<RealDebridUnrestrictLinkDto[]>(cacheKey).pipe(
      switchMap(cacheLinks => {
        if (cacheLinks) {
          return of(cacheLinks);
        }

        let torrentInfo: RealDebridTorrentsAddMagnetDto = null;
        return RealDebridTorrentsAddMagnetForm.submit(url).pipe(
          switchMap(t => {
            torrentInfo = t;
            return RealDebridTorrentsSelectFilesForm.submit(t.id, fileId).pipe(
              switchMap(() => {
                return RealDebridTorrentsInfoForm.submit(t.id);
              }),
              switchMap(info => {
                const links: RealDebridUnrestrictLinkDto[] = [];

                if (info.progress === 100 && info.links.length > 0) {
                  if (!isPackage) {
                    let foundLink = null;

                    let fileSize = 0;
                    let linkIndex = 0;

                    const selectedFiles = info.files.filter(file => file.selected);

                    selectedFiles.forEach((file, index) => {
                      if (file.selected && file.bytes > fileSize) {
                        fileSize = file.bytes;
                        linkIndex = index;
                      }
                    });
                    if (info.links[linkIndex]) {
                      foundLink = info.links[linkIndex];
                    } else {
                      foundLink = info.links.pop();
                    }


                    return RealDebridUnrestrictLinkForm.submit(foundLink).pipe(
                      map(link => {
                        links.push(link);

                        return links;
                      })
                    );
                  }

                  const obs = [];
                  info.links.forEach(link => {
                    obs.push(
                      RealDebridUnrestrictLinkForm.submit(link).pipe(
                        map(l => {
                          links.push(l);
                        })
                      )
                    );
                  });
                  return forkJoin(obs).pipe(mapTo(links));
                }

                return throwError('No links found');
              })
            );
          }),
          finalize(() => {
            if (torrentInfo) {
              RealDebridTorrentsDeleteForm.submit(torrentInfo.id).subscribe();
            }
          }),
          switchMap((links: RealDebridUnrestrictLinkDto[]) => {
            if (!links) {
              return throwError('No links found');
            }
            return from(HeliosCacheService.set(cacheKey, links, '15min')).pipe(mapTo(links));
          })
        );
      })
    );
  }
}
