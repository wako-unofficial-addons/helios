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
  static getData(url: string, fileIds: string[]): Observable<RealDebridUnrestrictLinkDto[]> {
    const fileId = fileIds.length === 0 ? 'all' : fileIds.join(',');
    const cacheKey = 'setCachedLinksRD_' + url + fileId;

    return HeliosCacheService.get<RealDebridUnrestrictLinkDto[]>(cacheKey).pipe(
      switchMap((cacheLinks) => {
        if (cacheLinks) {
          return of(cacheLinks);
        }

        let torrentInfo: RealDebridTorrentsAddMagnetDto = null;
        return RealDebridTorrentsAddMagnetForm.submit(url).pipe(
          switchMap((t) => {
            torrentInfo = t;
            return RealDebridTorrentsSelectFilesForm.submit(t.id, fileId).pipe(
              switchMap(() => {
                return RealDebridTorrentsInfoForm.submit(t.id);
              }),
              switchMap((info) => {
                const links: RealDebridUnrestrictLinkDto[] = [];

                if (info.links.length > 0) {
                  const obs = [];
                  info.links.forEach((link) => {
                    obs.push(
                      RealDebridUnrestrictLinkForm.submit(link).pipe(
                        map((l) => {
                          links.push(l);
                        })
                      )
                    );
                  });
                  return forkJoin(obs).pipe(mapTo(links));
                }

                if (fileId !== 'all') {
                  return this.getData(url, []);
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
