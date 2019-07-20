import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeAccountInfoDto } from '../../dtos/account/premiumize-account-info.dto';

export class PremiumizeAccountInfoForm {
  static submit(apikey?: string) {
    return PremiumizeApiService.post<PremiumizeAccountInfoDto>(
      `/account/info${apikey ? '?apikey=' + apikey : ''}`,
      null
    );
  }
}
