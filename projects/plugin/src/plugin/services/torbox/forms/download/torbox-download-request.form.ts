import { Observable } from 'rxjs';
import { TorboxDownloadRequestDto } from '../../dtos/download/torbox-download-request.dto';
import { TorboxApiService } from '../../services/torbox-api.service';

interface RequestDownloadParams {
  token?: string;
  torrent_id: string;
  file_id?: string;
  zip_link?: boolean;
  torrent_file?: boolean;
  user_ip?: string;
}

export class TorboxDownloadRequestForm {
  static submit(params: RequestDownloadParams): Observable<TorboxDownloadRequestDto> {
    if (!params.token) {
      params.token = TorboxApiService.getToken();
    }

    return TorboxApiService.get<TorboxDownloadRequestDto>(`/api/torrents/requestdl`, params);
  }
}
