import { Observable } from 'rxjs';
import { ProviderHttpService } from '../../provider-http.service';

export class TmdbApiService extends ProviderHttpService {
  static queueEnabled = true;

  static getApiBaseUrl() {
    return 'https://api.themoviedb.org/3';
  }

  static getTimeToWaitOnTooManyRequest() {
    return 5 * 1000;
  }

  static getSimultaneousRequest() {
    return 4;
  }

  static get<T>(url: string, params?: any, cacheTime?: string): Observable<T> {
    if (!params) {
      params = {};
    }

    params['api_key'] = '9f3ca569aa46b6fb13931ec96ab8ae7e';

    return super.get<T>(url, params, cacheTime);
  }
}
