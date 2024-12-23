import { Observable } from 'rxjs';
import { ProviderHttpService } from '../../provider-http.service';

export class TorboxApiService extends ProviderHttpService {
  private static apikey: string = null;

  static hasApiKey() {
    return !!this.apikey;
  }

  static setApiKey(apikey: string) {
    this.apikey = apikey;
  }

  static getToken() {
    return this.apikey;
  }

  static getApiBaseUrl() {
    return 'https://api.torbox.app/v1';
  }

  static getHeaders() {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${this.apikey}`,
    };
  }

  private static addParamsToUrl(url: string, params: any) {
    if (params) {
      const searchParams = new URLSearchParams('');

      for (const key in params) {
        if (params[key]) {
          searchParams.set(key, params[key]);
        }
      }

      url += (url.match(/\?/) ? '&' : '?') + decodeURIComponent(searchParams.toString());
    }

    return url;
  }

  static get<T>(url: string, params?: any, cacheTime?: string | number): Observable<T> {
    if (!params) {
      params = {};
    }

    return super.get<T>(this.addParamsToUrl(url, params), null, cacheTime);
  }

  static post<T>(url: string, body: object, cacheTime?: string) {
    const headers = this.getHeaders();

    // if (body instanceof FormData) {
    //   headers['Content-Type'] = 'application/x-www-form-urlencoded';
    //   // Convert FormData to object safely
    //   const formDataObj = {};
    //   body.forEach((value, key) => {
    //     formDataObj[key] = value;
    //   });
    //   body = formDataObj;
    // }

    return super.request<T>(
      {
        method: 'POST',
        url: this.getApiBaseUrl() + url,
        body: body,
        headers: headers,
      },
      cacheTime,
      50000,
    );
  }
}
