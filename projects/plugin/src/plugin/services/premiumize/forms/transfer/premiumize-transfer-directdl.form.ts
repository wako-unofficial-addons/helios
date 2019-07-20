import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PreimumizeTransferDirectdlDto } from '../../dtos/transfer/preimumize-transfer-directdl.dto';

export class PremiumizeTransferDirectdlForm {
  static submit(torrentUrl: string) {
    return PremiumizeApiService.get<PreimumizeTransferDirectdlDto>(
      '/transfer/directdl',
      {
        src: encodeURIComponent(torrentUrl)
      },
      '15min'
    );
  }
}
