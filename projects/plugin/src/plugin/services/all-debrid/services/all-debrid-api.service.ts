import { Observable } from 'rxjs';
import { ApiServicesHttpService } from '../../api-service-http.service';

export class AllDebridApiService extends ApiServicesHttpService {
  private static apikey = null;
  private static appName = null;

  static hasApiKey() {
    return !!this.apikey;
  }

  static setApiKey(apikey: string) {
    this.apikey = apikey;
  }

  static setName(name: string) {
    this.appName = name;
  }

  static getApiBaseUrl() {
    return 'https://api.alldebrid.com/v4';
  }

  static getHeaders() {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    return headers;
  }

  static get<T>(url: string, params?: any, cacheTime?: string | number): Observable<T> {
    if (!params) {
      params = {};
    }

    if (!params['apikey']) {
      params['apikey'] = this.apikey;
    }
    if (!params['agent']) {
      params['agent'] = this.appName;
    }

    return super.get<T>(url, params, cacheTime);
  }

  static post<T>(url: string, body: object, cacheTime?: string) {
    if (!url.match('apikey')) {
      url += '?apikey=' + this.apikey + '&agent=' + this.appName;
    }

    return super.request<T>(
      {
        method: 'POST',
        url: this.getApiBaseUrl() + url,
        body: body,
        headers: this.getHeaders(),
      },
      cacheTime,
    );
  }
}
