import { RealDebridTorrentsAddMagnetForm } from '../forms/torrents/real-debrid-torrents-add-magnet.form';
import { catchError, finalize, retry, switchMap } from 'rxjs/operators';
import { RealDebridTorrentsInfoForm } from '../forms/torrents/real-debrid-torrents-info.form';
import { of, throwError } from 'rxjs';
import { RealDebridTorrentsSelectFilesForm } from '../forms/torrents/real-debrid-torrents-select-files.form';
import { RealDebridTorrentsDeleteForm } from '../forms/torrents/real-debrid-torrents-delete.form';
import { RealDebridTorrentsAddMagnetDto } from '../dtos/torrents/real-debrid-torrents-add-magnet.dto';
import { isVideoFile } from '../../tools';
import { RD_ERR_CODE_NOT_CACHED } from '../../../queries/debrids/real-debrid/real-debrid-get-cached-url.query';

export class RealDebridCacheUrlCommand {
  static handle({ url, deleteIt = true }: { url: string; deleteIt?: boolean }) {
    let magnetResponse: RealDebridTorrentsAddMagnetDto = null;
    return RealDebridTorrentsAddMagnetForm.submit(url).pipe(
      switchMap((addMagnetResponse) => {
        magnetResponse = addMagnetResponse;
        return RealDebridTorrentsInfoForm.submit(addMagnetResponse.id);
      }),
      switchMap((info) => {
        if (info.status === 'magnet_error') {
          RealDebridTorrentsDeleteForm.submit(magnetResponse.id).subscribe();

          return throwError(() => new Error('Cannot add this source: ' + info.status));
        }
        if (info.files.length === 0) {
          RealDebridTorrentsDeleteForm.submit(magnetResponse.id).subscribe();

          return throwError(() => new Error('Cannot add this source: ' + info.status));
        }

        return RealDebridTorrentsSelectFilesForm.submit(info.id, 'all').pipe(
          retry(2),
          catchError((err) => {
            if (err?.response?.error === 'wrong_parameter' && err?.response?.error_details.match('{files}')) {
              // In that case we only need to select video files
              let fileId: string = undefined;
              for (const file of info.files) {
                if (isVideoFile(file.path)) {
                  fileId = file.id.toString();
                  break;
                }
              }
              if (fileId) {
                return RealDebridTorrentsSelectFilesForm.submit(info.id, fileId);
              }
            }
            RealDebridTorrentsDeleteForm.submit(magnetResponse.id).subscribe();

            return throwError(() => err);
          }),
          switchMap(() => {
            return RealDebridTorrentsInfoForm.submit(info.id);
          }),
          switchMap((info) => {
            if (deleteIt) {
              return RealDebridTorrentsDeleteForm.submit(magnetResponse.id).pipe(
                switchMap(() => {
                  if (info.status !== 'downloaded') {
                    return throwError(() => ({
                      code: RD_ERR_CODE_NOT_CACHED,
                      message: 'Real Debrid: This source is not cached. Try to add the torrent manually',
                    }));
                  }

                  return of(info);
                }),
              );
            }

            return of(info);
          }),
        );
      }),
    );
  }
}
