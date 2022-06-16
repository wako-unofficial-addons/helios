import { RealDebridUnrestrictLinkDto } from '../../dtos/unrestrict/real-debrid-unrestrict-link.dto';
import { RealDebridApiService } from '../../services/real-debrid-api.service';

export class RealDebridUnrestrictLinkForm {
  static submit(link: string) {
    return RealDebridApiService.post<RealDebridUnrestrictLinkDto>(
      `/unrestrict/link`,
      {
        link: link,
      },
      null,
      null
    );
  }
}
