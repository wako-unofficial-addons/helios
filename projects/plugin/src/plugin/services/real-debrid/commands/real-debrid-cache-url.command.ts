import { RealDebridTorrentsAddMagnetForm } from '../forms/torrents/real-debrid-torrents-add-magnet.form';
import { retry, switchMap } from 'rxjs/operators';
import { RealDebridTorrentsInfoForm } from '../forms/torrents/real-debrid-torrents-info.form';
import { of, throwError } from 'rxjs';
import { RealDebridTorrentsSelectFilesForm } from '../forms/torrents/real-debrid-torrents-select-files.form';
import { RealDebridTorrentsDeleteForm } from '../forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridTorrentsAddMagnetDto } from '../dtos/torrents/real-debrid-torrents-add-magnet.dto';

export class RealDebridCacheUrlCommand {
  static handle(url: string) {
    let torrent: RealDebridTorrentsAddMagnetDto = null;
    return RealDebridTorrentsAddMagnetForm.submit(url).pipe(
      switchMap((t) => {
        torrent = t;
        return RealDebridTorrentsInfoForm.submit(t.id);
      }),
      switchMap((info) => {
        if (info.files.length === 0) {
          RealDebridTorrentsDeleteForm.submit(torrent.id).subscribe();

          return throwError('Cannot add this source: ' + info.status);
        }

        return RealDebridTorrentsSelectFilesForm.submit(info.id, 'all').pipe(
          retry(2),
          switchMap(() => {
            return RealDebridTorrentsInfoForm.submit(info.id);
          })
        );
      })
    );
  }
}
