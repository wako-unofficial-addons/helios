import { AllDebridApiService } from '../../services/all-debrid-api.service';
import { AllDebridLinkUnlockDto } from '../../dtos/link/all-debrid-link-unlock.dto';

export class AllDebridLinkUnlockForm {
  static submit(link: string) {
    return AllDebridApiService.get<AllDebridLinkUnlockDto>('/link/unlock', {
      link: link
    });
  }
}
