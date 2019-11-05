import { RealDebridOauthTokenDto } from '../../dtos/oauth/real-debrid-oauth-token.dto';
import { RealDebridOauthApiService } from '../../services/real-debrid-oauth-api.service';

export class RealDebridOauthTokenForm {
  static submit(client_id: string, client_secret: string, code: string) {
    return RealDebridOauthApiService.post<RealDebridOauthTokenDto>('/token', {
      client_id: client_id,
      client_secret: client_secret,
      code: code,
      grant_type: 'http://oauth.net/grant_type/device/1.0'
    });
  }
}
