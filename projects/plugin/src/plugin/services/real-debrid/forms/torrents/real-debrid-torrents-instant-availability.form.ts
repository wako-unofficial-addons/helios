import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { RealDebridTorrentsInstantAvailabilityDto } from '../../dtos/torrents/real-debrid-torrents-instant-availability.dto';
import { RealDebridApiService } from '../../services/real-debrid-api.service';

export class RealDebridTorrentsInstantAvailabilityForm {
  static submit(hashList: string[]) {
    if (hashList.length === 0) {
      return of(null);
    }

    const allGroups = [];
    let hashGroup = [];
    hashList.forEach((h) => {
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

    allGroups.forEach((hashes) => {
      const urlSearchParam = new URLSearchParams();
      hashes.forEach((h) => {
        urlSearchParam.append('items[]', h);
      });

      obss.push(RealDebridApiService.get<RealDebridTorrentsInstantAvailabilityDto>(`/torrents/instantAvailability/${hashes.join('/')}`));
    });

    let dto = {} as RealDebridTorrentsInstantAvailabilityDto;

    return forkJoin(...obss).pipe(
      map((dtos: RealDebridTorrentsInstantAvailabilityDto[]) => {
        dtos.forEach((d) => {
          dto = Object.assign(dto, d);
        });
        return dto;
      })
    );
  }
}
