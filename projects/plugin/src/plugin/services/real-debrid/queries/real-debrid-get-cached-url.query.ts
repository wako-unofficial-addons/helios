import { forkJoin, from, Observable, of, throwError } from 'rxjs';
import { RealDebridUnrestrictLinkDto } from '../dtos/unrestrict/real-debrid-unrestrict-link.dto';
import { finalize, map, mapTo, switchMap } from 'rxjs/operators';
import { RealDebridTorrentsAddMagnetForm } from '../forms/torrents/real-debrid-torrents-add-magnet.form';
import { RealDebridTorrentsSelectFilesForm } from '../forms/torrents/real-debrid-torrents-select-files.form';
import { RealDebridTorrentsDeleteForm } from '../forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridTorrentsInfoForm } from '../forms/torrents/real-debrid-torrents-info.form';
import { RealDebridUnrestrictLinkForm } from '../forms/unrestrict/real-debrid-unrestrict-link.form';
import { RealDebridTorrentsAddMagnetDto } from '../dtos/torrents/real-debrid-torrents-add-magnet.dto';
import { HeliosCacheService } from '../../provider-cache.service';

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
                    let fileSize = 0;
                    let linkIndex = 0;
                    const selectedFiles = info.files.filter(file => file.selected);

                    selectedFiles.forEach((file, index) => {
                      if (file.selected && file.bytes > fileSize) {
                        fileSize = file.bytes;
                        linkIndex = index;
                      }
                    });

                    return RealDebridUnrestrictLinkForm.submit(info.links[linkIndex]).pipe(
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
