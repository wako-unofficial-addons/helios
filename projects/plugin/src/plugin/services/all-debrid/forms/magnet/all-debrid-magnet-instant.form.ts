import { AllDebridApiService } from '../../services/all-debrid-api.service';
import { AllDebridMagnetInstantDto } from '../../dtos/magnet/all-debrid-magnet-instant.dto';

export class AllDebridMagnetInstantForm {
  static submit(hash: string[]) {

    const urlSearchParam = new URLSearchParams();
    hash.forEach(h => {
      urlSearchParam.append('magnets[]', encodeURIComponent(h));
    });

    return AllDebridApiService.get<AllDebridMagnetInstantDto>('/magnet/instant?' + decodeURIComponent(urlSearchParam.toString()), null, null);

  }
}
