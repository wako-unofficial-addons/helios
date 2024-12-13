import { AllDebridAccountInfoDto } from '../../dtos/account/all-debrid-account-info.dto';
import { AllDebridApiService } from '../../services/all-debrid-api.service';

export class AllDebridUserForm {
  static submit(apikey: string, name: string) {
    return AllDebridApiService.get<AllDebridAccountInfoDto>(
      `/user`,
      {
        apikey: apikey,
        agent: name,
      },
      '15min',
    );
  }
}
