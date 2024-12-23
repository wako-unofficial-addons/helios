import { TorboxApiService } from '../../services/torbox-api.service';
import { TorboxTransferCreateDto } from '../../dtos/transfer/torbox-transfer-create.dto';

export class TorboxTransferCreateForm {
  static submit(magnetOrUrl: string) {
    const params = {
      seed: '1', // auto seeding
      allow_zip: 'true',
      as_queued: 'false',
    };

    if (magnetOrUrl.startsWith('magnet:')) {
      params['magnet'] = magnetOrUrl;
    } else {
      params['url'] = magnetOrUrl;
    }

    return TorboxApiService.post<TorboxTransferCreateDto>('/api/torrents/createtorrent', params);
  }
}
