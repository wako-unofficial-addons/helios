import { RealDebridOauthCredentialsDto } from '../../dtos/oauth/real-debrid-oauth-credentials.dto';
import { RealDebridOauthApiService } from '../../services/real-debrid-oauth-api.service';

export class RealDebridOauthCredentialsForm {
  static submit(client_id: string, code: string) {
    return RealDebridOauthApiService.get<RealDebridOauthCredentialsDto>('/device/credentials', {
      client_id: client_id,
      code: code
    });
  }
}
