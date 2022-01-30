import { Observable } from 'rxjs';
import { ProviderHttpService } from '../../provider-http.service';
import { logData } from '../../tools';

export class PremiumizeApiService extends ProviderHttpService {
  private static apikey;

  static hasApiKey() {
    return !!this.apikey;
  }

  static setApiKey(apikey: string) {
    this.apikey = apikey;
  }

  static getApiBaseUrl() {
    return 'https://www.premiumize.me/api';
  }

  static getHeaders() {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    return headers;
  }

  private static addParamsToUrl(url: string, params: any) {
    if (params) {
      const searchParams = new URLSearchParams('');

      for (const key in params) {
        if (params[key]) {
          searchParams.set(key, params[key]);
        }
      }

      url += (url.match(/\?/) ? '&' : '?') + decodeURIComponent(searchParams.toString()).replace(/’/gi, "'");
    }

    return url;
  }

  static get<T>(url: string, params?: any, cacheTime?: string | number): Observable<T> {
    if (!params) {
      params = {};
    }

    if (!params['apikey']) {
      params['apikey'] = this.apikey;
    }

    return super.get<T>(this.addParamsToUrl(url, params), null, cacheTime, 40000);
  }

  static post<T>(url: string, body: Object, cacheTime?: string) {
    if (!url.match('apikey')) {
      url += '?apikey=' + this.apikey;
    }

    return super.request<T>(
      {
        method: 'POST',
        url: this.getApiBaseUrl() + url,
        body: body,
        headers: this.getHeaders()
      },
      cacheTime
    );
  }
}
