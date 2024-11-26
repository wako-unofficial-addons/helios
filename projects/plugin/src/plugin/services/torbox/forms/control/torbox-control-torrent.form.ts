import { Observable } from 'rxjs';
import { TorboxControlTorrentDto } from '../../dtos/control/torbox-control-torrent.dto';
import { TorboxApiService } from '../../services/torbox-api.service';

type TorboxControlOperation = 'reannounce' | 'delete' | 'resume';

interface ControlTorrentParams {
  torrent_id?: string;
  operation: TorboxControlOperation;
  all?: boolean;
}

export class TorboxControlTorrentForm {
  static submit(params: ControlTorrentParams): Observable<TorboxControlTorrentDto> {
    return TorboxApiService.post<TorboxControlTorrentDto>('/api/torrents/controltorrent', params);
  }
}
