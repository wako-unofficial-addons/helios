import { RealDebridOauthCodeDto } from '../../dtos/oauth/real-debrid-oauth-code.dto';
import { RealDebridOauthApiService } from '../../services/real-debrid-oauth-api.service';

export class RealDebridOauthCodeForm {
  static submit(client_id: string) {
    return RealDebridOauthApiService.get<RealDebridOauthCodeDto>('/device/code', {
      client_id: client_id,
      new_credentials: 'yes'
    });
  }
}
