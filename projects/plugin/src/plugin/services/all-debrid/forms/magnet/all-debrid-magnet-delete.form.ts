import { AllDebridApiService } from '../../services/all-debrid-api.service';
import { AllDebridMagnetDeleteDto } from '../../dtos/magnet/all-debrid-magnet-delete.dto';

export class AllDebridMagnetDeleteForm {
  static submit(id) {

    return AllDebridApiService.get<AllDebridMagnetDeleteDto>('/magnet/delete', {
      id: id
    }, null);

  }
}
