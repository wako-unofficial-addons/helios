import { RealDebridApiService } from './real-debrid-api.service';

export class RealDebridOauthApiService extends RealDebridApiService {
  static getApiBaseUrl() {
    return 'https://api.real-debrid.com/oauth/v2';
  }
}
