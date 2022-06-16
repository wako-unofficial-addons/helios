import { RealDebridTorrentsInfoDto } from '../../dtos/torrents/real-debrid-torrents-info.dto';
import { RealDebridApiService } from '../../services/real-debrid-api.service';

export class RealDebridTorrentsInfoForm {
  static submit(torrentId: string) {
    return RealDebridApiService.get<RealDebridTorrentsInfoDto>(`/torrents/info/${torrentId}`, null, null, null);
  }
}
