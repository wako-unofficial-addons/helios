import { TorboxApiService } from '../../services/torbox-api.service';
import { TorboxUserMeDto } from '../../dtos/user/torbox-user-me.dto';

export class TorboxUserMeForm {
  static submit() {
    return TorboxApiService.get<TorboxUserMeDto>('/api/user/me');
  }
}
