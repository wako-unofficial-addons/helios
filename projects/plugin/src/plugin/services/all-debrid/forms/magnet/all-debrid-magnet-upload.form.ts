import { AllDebridApiService } from '../../services/all-debrid-api.service';
import { AllDebridMagnetUploadDto } from '../../dtos/magnet/all-debrid-magnet-upload.dto';

export class AllDebridMagnetUploadForm {
  static submit(hash: string[]) {

    const urlSearchParam = new URLSearchParams();
    hash.forEach(h => {
      urlSearchParam.append('magnets[]', encodeURIComponent(h.split('&').shift()));
    });

    return AllDebridApiService.get<AllDebridMagnetUploadDto>('/magnet/upload?' + decodeURIComponent(urlSearchParam.toString()), null, null);

  }
}
