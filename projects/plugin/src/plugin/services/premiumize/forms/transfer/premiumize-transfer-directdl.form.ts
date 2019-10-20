import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeTransferDirectdlDto } from '../../dtos/transfer/premiumize-transfer-directdl.dto';

export class PremiumizeTransferDirectdlForm {
  static submit(torrentUrl: string) {
    return PremiumizeApiService.get<PremiumizeTransferDirectdlDto>(
      '/transfer/directdl',
      {
        src: encodeURIComponent(torrentUrl)
      },
      '15min'
    );
  }
}
