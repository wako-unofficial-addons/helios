import { RealDebridApiService } from '../../services/real-debrid-api.service';

export class RealDebridTorrentsDeleteForm {
  static submit(torrentId: string) {
    return RealDebridApiService.delete(`/torrents/delete/${torrentId}`, null);
  }
}
