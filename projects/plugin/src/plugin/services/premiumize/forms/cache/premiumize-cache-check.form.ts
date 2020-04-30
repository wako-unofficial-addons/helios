import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeCacheCheckDto } from '../../dtos/cache/premiumize-cache-check.dto';

export class PremiumizeCacheCheckForm {
  static submit(hash: string[]) {
    const urlSearchParam = new URLSearchParams();
    hash.forEach((h) => {
      urlSearchParam.append('items[]', h);
    });

    return PremiumizeApiService.get<PremiumizeCacheCheckDto>('/cache/check?' + decodeURIComponent(urlSearchParam.toString()));
  }
}
