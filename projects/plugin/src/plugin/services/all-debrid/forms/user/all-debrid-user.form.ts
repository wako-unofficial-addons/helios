import { PremiumizeAccountInfoDto } from '../../../premiumize/dtos/account/premiumize-account-info.dto';
import { AllDebridApiService } from '../../services/all-debrid-api.service';

export class AllDebridUserForm {
  static submit(apikey: string, name: string) {
    return AllDebridApiService.get<PremiumizeAccountInfoDto>(
      `/user`,
      {
        apikey: apikey,
        agent: name
      },
      '15min'
    );
  }
}
