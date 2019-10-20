import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeTransferCreateDto } from '../../dtos/transfer/premiumize-transfer-create.dto';

export class PremiumizeTransferCreateForm {
  static submit(torrentUrl: string) {
    return PremiumizeApiService.post<PremiumizeTransferCreateDto>('/transfer/create', {
      src: torrentUrl
    });
  }
}
