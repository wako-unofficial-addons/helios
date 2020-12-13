import { HeliosCacheService } from '../../../services/provider-cache.service';
import { mapTo, switchMap } from 'rxjs/operators';
import { AllDebridMagnetUploadForm } from '../../../services/all-debrid/forms/magnet/all-debrid-magnet-upload.form';
import { from, of, throwError } from 'rxjs';
import { AllDebridMagnetStatusForm } from '../../../services/all-debrid/forms/magnet/all-debrid-magnet-status.form';
import { AllDebridMagnetStatusMagnetDto } from '../../../services/all-debrid/dtos/magnet/all-debrid-magnet-status.dto';

export class AllDebridGetLinksQuery {
  static getData(url: string, isPackage: boolean) {
    const cacheKey = 'setCachedLinksAD_' + url + isPackage;

    return HeliosCacheService.get<AllDebridMagnetStatusMagnetDto>(cacheKey).pipe(
      switchMap((cacheLinks) => {
        if (cacheLinks) {
          return of(cacheLinks);
        }

        let magnetId = null;

        return AllDebridMagnetUploadForm.submit([url]).pipe(
          switchMap((dto) => {
            if (dto.status !== 'success') {
              let error = 'All Debrid /magnet/upload - Generic error';
              if (dto?.error?.message) {
                error = 'All Debrid /magnet/upload - ' + dto.error.message;
              }
              return throwError(error);
            }

            const magnet = dto.data.magnets.shift();

            if (magnet.error) {
              return throwError('All Debrid /magnet/upload - ' + magnet.error.message);
            }

            magnetId = magnet.id;

            if (!magnet.ready) {
              return throwError('All Debrid /magnet/upload - torrent is not ready yet');
            }

            return AllDebridMagnetStatusForm.submit(magnet.id).pipe(
              switchMap((statusDto) => {
                if (statusDto.status !== 'success') {
                  return throwError('All Debrid /magnet/status - Generic error');
                }
                const magnetStatus = statusDto.data.magnets as AllDebridMagnetStatusMagnetDto;

                if (magnetStatus.error) {
                  return throwError('All Debrid /magnet/status - ' + magnetStatus.error.message);
                }

                if (magnetStatus.statusCode !== 4) {
                  return throwError('All Debrid /magnet/status - torrent is not ready yet');
                }

                return from(HeliosCacheService.set(cacheKey, magnetStatus, '15min')).pipe(mapTo(magnetStatus));
              })
            );
          })
        );
      })
    );
  }
}
