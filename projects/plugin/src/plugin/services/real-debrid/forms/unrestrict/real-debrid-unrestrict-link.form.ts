import { RealDebridApiService } from '../../services/real-debrid-api.service';
import { RealDebridUnrestrictLinkDto } from '../../dtos/unrestrict/real-debrid-unrestrict-link.dto';

export class RealDebridUnrestrictLinkForm {
  static submit(link: string) {
    return RealDebridApiService.post<RealDebridUnrestrictLinkDto>(`/unrestrict/link`, {
      link: link
    });
  }
}
