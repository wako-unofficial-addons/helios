import { Observable } from 'rxjs';
import { TorboxTorrentListDto } from '../../dtos/torrent/torbox-torrent-list.dto';
import { TorboxApiService } from '../../services/torbox-api.service';

interface TorrentListParams {
  bypass_cache?: boolean;
  id?: number;
  offset?: number;
  limit?: number;
}

export class TorboxTorrentListForm {
  static submit(params?: TorrentListParams): Observable<TorboxTorrentListDto> {
    const queryParams = new URLSearchParams();

    if (params?.bypass_cache) {
      queryParams.append('bypass_cache', 'true');
    }
    if (params?.id !== undefined) {
      queryParams.append('id', params.id.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    const url = `/api/torrents/mylist${queryString ? `?${queryString}` : ''}`;

    return TorboxApiService.get<TorboxTorrentListDto>(url);
  }
}
