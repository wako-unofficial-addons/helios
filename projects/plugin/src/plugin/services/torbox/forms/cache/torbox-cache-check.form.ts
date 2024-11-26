import { TorboxApiService } from '../../services/torbox-api.service';
import { TorboxCacheCheckDto } from '../../dtos/cache/torbox-cache-check.dto';

export class TorboxCacheCheckForm {
  static submit(hashes: string[]) {
    // Convertir le tableau de hashes en paramètres de requête
    const params = new URLSearchParams();
    hashes.forEach((hash) => {
      params.append('hash', hash);
    });
    params.append('format', 'object');
    params.append('list_files', 'true');

    return TorboxApiService.get<TorboxCacheCheckDto>(
      '/api/torrents/checkcached?' + decodeURIComponent(params.toString()),
    );
  }
}
