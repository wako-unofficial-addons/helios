import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeCacheCheckDto } from '../../dtos/cache/premiumize-cache-check.dto';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';

export class PremiumizeCacheCheckForm {
  static submit(hash: string[]) {

    const allGroups = [];
    let hashGroup = [];
    hash.forEach(h => {
      if (hashGroup.length > 50) {
        allGroups.push(hashGroup);
        hashGroup = [];
      }
      hashGroup.push(h);
    });

    if (hashGroup.length > 0) {
      allGroups.push(hashGroup);
    }

    const obss = [];

    allGroups.forEach(hashes => {
      const urlSearchParam = new URLSearchParams();
      hashes.forEach(h => {
        urlSearchParam.append('items[]', h);
      });

      obss.push(
        PremiumizeApiService.get<PremiumizeCacheCheckDto>('/cache/check?' + decodeURIComponent(urlSearchParam.toString()), null, null)
      );
    });

    const dto: PremiumizeCacheCheckDto = {
      status: 'success',
      filename: [],
      filesize: [],
      response: [],
      transcoed: []
    };

    if (obss.length === 0) {
      return of(dto);
    }

    return forkJoin(...obss)
      .pipe(map((dtos: PremiumizeCacheCheckDto[]) => {
        dtos.forEach(d => {
          if (d.status === 'success') {
            dto.filename = dto.filename.concat(d.filename);
            dto.filesize = dto.filesize.concat(d.filesize);
            dto.response = dto.response.concat(d.response);
            dto.transcoed = dto.transcoed.concat(d.transcoed);
          }
        });
        return dto;
      }));
  }
}
