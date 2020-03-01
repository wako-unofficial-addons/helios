import { AllDebridApiService } from '../../services/all-debrid-api.service';
import { AllDebridMagnetStatusDto } from '../../dtos/magnet/all-debrid-magnet-status.dto';

export class AllDebridMagnetStatusForm {
  static submit(id) {

    return AllDebridApiService.get<AllDebridMagnetStatusDto>('/magnet/status', {
      id: id
    }, null);

  }
}
