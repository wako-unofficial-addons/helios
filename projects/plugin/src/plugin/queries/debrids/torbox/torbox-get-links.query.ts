import { HeliosCacheService } from '../../../services/provider-cache.service';
import { mapTo, switchMap, catchError, mergeMap, map, tap } from 'rxjs/operators';
import { from, of, throwError, forkJoin } from 'rxjs';
import { TorboxFileListDto } from '../../../services/torbox/dtos/file/torbox-file-list.dto';
import { TorboxTransferCreateForm } from '../../../services/torbox/forms/transfer/torbox-transfer-create.form';
import { TorboxDownloadRequestForm } from '../../../services/torbox/forms/download/torbox-download-request.form';
import { TorboxCacheCheckForm } from '../../../services/torbox/forms/cache/torbox-cache-check.form';
import { TorboxControlTorrentForm } from '../../../services/torbox/forms/control/torbox-control-torrent.form';
import { getHashFromUrl } from '../../../services/tools';

export class TorboxGetLinksQuery {
  static getData(url: string, isPackage: boolean) {
    const cacheKey = 'setCachedLinksTB_' + url + isPackage;

    return HeliosCacheService.get<TorboxFileListDto>(cacheKey).pipe(
      switchMap((cacheLinks) => {
        if (cacheLinks) {
          return of(cacheLinks);
        }

        const hash = getHashFromUrl(url);

        return TorboxCacheCheckForm.submit([hash]).pipe(
          switchMap((cacheDto) => {
            if (!cacheDto.success || !cacheDto.data) {
              return throwError('Torbox /cache/check - No files found');
            }

            return TorboxTransferCreateForm.submit(url).pipe(
              switchMap((transferDto) => {
                if (!transferDto.success || !transferDto.data) {
                  return throwError('Torbox /transfer/create - No files found');
                }

                const torrentId = transferDto.data.torrent_id;
                const data = Object.values(cacheDto.data)[0];

                if (!data.files || data.files.length === 0) {
                  return throwError('Torbox /cache/check - No files found in torrent');
                }

                // Si un seul fichier, on demande directement le lien
                if (data.files.length === 1) {
                  return TorboxDownloadRequestForm.submit({
                    torrent_id: torrentId,
                    file_id: '0',
                    zip_link: false,
                  }).pipe(
                    map(
                      (response) =>
                        ({
                          success: true,
                          status: 'success' as const,
                          data: {
                            files: [
                              {
                                id: '0',
                                name: data.files[0].name,
                                size: data.files[0].size,
                                stream_url: response.data,
                                download_url: response.data,
                                mime_type: 'video/mp4',
                                created_at: new Date().toISOString(),
                              },
                            ],
                          },
                        }) as TorboxFileListDto,
                    ),
                    tap(() => {
                      TorboxControlTorrentForm.submit({
                        torrent_id: torrentId,
                        operation: 'delete',
                      }).subscribe();
                    }),
                  );
                }

                // Pour plusieurs fichiers, on demande un lien pour chaque fichier
                const downloadRequests = data.files.map((file, index) =>
                  TorboxDownloadRequestForm.submit({
                    torrent_id: torrentId,
                    file_id: index.toString(),
                    zip_link: false,
                  }).pipe(
                    map((response) => ({
                      id: index.toString(),
                      name: file.name,
                      size: file.size,
                      stream_url: response.data,
                      download_url: response.data,
                      mime_type: 'video/mp4',
                      created_at: new Date().toISOString(),
                    })),
                  ),
                );

                return forkJoin(downloadRequests).pipe(
                  map(
                    (files) =>
                      ({
                        success: true,
                        status: 'success' as const,
                        data: {
                          files,
                        },
                      }) as TorboxFileListDto,
                  ),
                  tap(() => {
                    TorboxControlTorrentForm.submit({
                      torrent_id: torrentId,
                      operation: 'delete',
                    }).subscribe();
                  }),
                );
              }),
            );
          }),
        );
      }),
      catchError((err) => throwError('Torbox /transfer/create - ' + (err?.response?.detail ?? err))),
    );
  }
}
