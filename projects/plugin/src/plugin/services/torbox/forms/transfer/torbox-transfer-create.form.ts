import { TorboxApiService } from '../../services/torbox-api.service';
import { TorboxTransferCreateDto } from '../../dtos/transfer/torbox-transfer-create.dto';

export class TorboxTransferCreateForm {
  static submit(magnetOrUrl: string) {
    const params = new FormData();
    params.append('seed', '1'); // auto seeding
    params.append('allow_zip', 'true');
    params.append('as_queued', 'false');

    // Si c'est un magnet link
    if (magnetOrUrl.startsWith('magnet:')) {
      params['magnet'] = magnetOrUrl;
    }
    // Si c'est une URL de torrent
    else {
      params['url'] = magnetOrUrl;
    }

    return TorboxApiService.post<TorboxTransferCreateDto>('/api/torrents/createtorrent', params);
  }
}
