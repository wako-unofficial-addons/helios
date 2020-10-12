import { RealDebridApiService } from '../../services/real-debrid-api.service';

export class RealDebridTorrentsSelectFilesForm {
  static submit(torrentId: string, fileId: string) {
    return RealDebridApiService.post(
      `/torrents/selectFiles/${torrentId}`,
      {
        files: fileId
      },
      null,
      null,
      false
    );
  }
}
