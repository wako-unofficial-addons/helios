import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PreimumizeTransferCreateDto } from '../../dtos/transfer/preimumize-transfer-create.dto';

export class PremiumizeTransferCreateForm {
  static submit(torrentUrl: string) {
    return PremiumizeApiService.post<PreimumizeTransferCreateDto>('/transfer/create', {
      src: torrentUrl
    });
  }
}
