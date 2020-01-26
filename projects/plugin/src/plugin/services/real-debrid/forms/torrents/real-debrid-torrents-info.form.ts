import { RealDebridApiService } from '../../services/real-debrid-api.service';
import { RealDebridTorrentsInfoDto } from '../../dtos/torrents/real-debrid-torrents-info.dto';

export class RealDebridTorrentsInfoForm {
  static submit(torrentId: string) {
    return RealDebridApiService.get<RealDebridTorrentsInfoDto>(`/torrents/info/${torrentId}`);
  }
}
