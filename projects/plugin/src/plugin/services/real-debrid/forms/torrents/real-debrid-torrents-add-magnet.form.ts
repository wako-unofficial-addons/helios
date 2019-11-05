import { RealDebridApiService } from '../../services/real-debrid-api.service';
import { RealDebridTorrentsAddMagnetDto } from '../../dtos/torrents/real-debrid-torrents-add-magnet.dto';

export class RealDebridTorrentsAddMagnetForm {
  static submit(magnet: string) {
    return RealDebridApiService.post<RealDebridTorrentsAddMagnetDto>(`/torrents/addMagnet`, {
      magnet: magnet
    });
  }
}
