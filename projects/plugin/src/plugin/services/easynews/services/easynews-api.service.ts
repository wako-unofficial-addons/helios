import { Observable } from 'rxjs';
import { ProviderHttpService } from '../../provider-http.service';

export class EasynewsApiService extends ProviderHttpService {
  private static username: string;
  private static password: string;
  static baseUrl = 'https://members.easynews.com/2.0/search/solr-search/';

  static setCredentials(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  static getCredentials() {
    return {
      username: this.username,
      password: this.password,
    };
  }

  private static getAuthHeader() {
    return 'Basic ' + btoa(`${this.username}:${this.password}`);
  }

  static getHeaders() {
    return {
      Authorization: this.getAuthHeader(),
    };
  }

  static addParamsToUrl(url: string, params: any) {
    if (params) {
      const searchParams = new URLSearchParams();

      for (const key in params) {
        if (params[key]) {
          if (Array.isArray(params[key])) {
            // Handle array parameters like fty[]
            params[key].forEach((value: string) => {
              searchParams.append(`${key}`, value);
            });
          } else {
            searchParams.set(key, params[key].toString());
          }
        }
      }

      url += (url.match(/\?/) ? '&' : '?') + decodeURIComponent(searchParams.toString());
    }

    return url;
  }

  static get<T>(url: string, params?: any, cacheTime?: string | number, timeout?: number): Observable<T> {
    return super.get<T>(url, params, cacheTime, timeout);
  }
}
