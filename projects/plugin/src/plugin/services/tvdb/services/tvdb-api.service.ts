import { switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ProviderHttpService } from '../../provider-http.service';
import { WakoHttpRequest } from '@wako-app/mobile-sdk';

export class TvdbApiService extends ProviderHttpService {
  private static apiKey = '43VPI0R8323FB7TI';

  static queueEnabled = true;

  static getApiBaseUrl() {
    return 'https://api.thetvdb.com';
  }

  static getTimeToWaitOnTooManyRequest() {
    return 5 * 1000;
  }

  static getSimultaneousRequest() {
    return 4;
  }

  static getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (!!this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    return headers;
  }

  private static login() {
    return ProviderHttpService.request<{ token: string }>({
      url: this.getApiBaseUrl() + '/login',
      method: 'POST',
      body: {
        apikey: this.apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'json'
    }, '1d');
  }

  static request<T>(httpRequest: WakoHttpRequest, cacheTime?: string | number, timeoutMs?: number, byPassCors?: any, timeToWaitOnTooManyRequest?: number, timeToWaitBetweenEachRequest?: number): Observable<T> {

    return this.login()
      .pipe(
        switchMap(data => {
          this.setToken(data.token);
          return super.request<T>(httpRequest, cacheTime, timeoutMs, byPassCors, timeToWaitOnTooManyRequest, timeToWaitBetweenEachRequest)
        })
      )

  }
}
