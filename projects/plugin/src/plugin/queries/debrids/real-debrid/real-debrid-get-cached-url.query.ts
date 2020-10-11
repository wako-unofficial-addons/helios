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
import { getSupportedMedia } from '../../../services/tools';

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
                  return forkJoin(obs).pipe(
                    switchMap(() => {
                      const videoLinks = [];
                      const otherLinks = [];

                      links.forEach((link) => {
                        const ext = '.' + link.filename.split('.').pop().toLowerCase();
                        const commonVideoExtensions = getSupportedMedia('video').split('|');

                        if (!commonVideoExtensions.includes(ext) || ext === '.rar') {
                          otherLinks.push(link);
                        } else {
                          videoLinks.push(link);
                        }
                      });

                      if (videoLinks.length === 0 && otherLinks.length > 0 && fileId !== 'all') {
                        return this.getData(url, []);
                      }

                      if (videoLinks.length === 0 && otherLinks.length > 0) {
                        videoLinks.push(...otherLinks);
                      }
                      return of(videoLinks);
                    })
                  );
                }

                if (fileId !== 'all') {
                  return this.getData(url, []);
                }
                return throwError('No links found. It seems the source is not fully cached, try to add the trorrent manually');
              })
            );
          }),
          finalize(() => {
            if (torrentInfo) {
              RealDebridTorrentsDeleteForm.submit(torrentInfo.id).subscribe();
            }
          }),
          switchMap((allLinks: RealDebridUnrestrictLinkDto[]) => {
            const links: RealDebridUnrestrictLinkDto[] = [];

            if (allLinks) {
              allLinks.forEach((link) => {
                if (link.mimeType.match('video') !== null || link.mimeType === 'application/x-rar-compressed') {
                  links.push(link);
                }
              });
            }

            if (links.length === 0) {
              return throwError('No links found. It seems the source is not fully cached, try to add the trorrent manually');
            }
            return from(HeliosCacheService.set(cacheKey, links, '15min')).pipe(mapTo(links));
          })
        );
      })
    );
  }
}
