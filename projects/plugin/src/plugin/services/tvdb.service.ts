import { Injectable } from '@angular/core';
import { ProviderHttpService } from './provider-http.service';
import { map, switchMap } from 'rxjs/operators';

@Injectable()
export class TvdbService {

  private baseUrl = 'https://api.thetvdb.com';

  private apiKey = '43VPI0R8323FB7TI';

  constructor() {

  }

  private login() {
    return ProviderHttpService.request<{ token: string }>({
      url: this.baseUrl + '/login',
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

  getEpisode(tvdbId: number) {
    return this.login()
      .pipe(
        switchMap(data => {
          return ProviderHttpService.request<{ data: { absoluteNumber: number } }>({
            url: this.baseUrl + '/episodes/' + tvdbId,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + data.token
            },
            responseType: 'json'
          }, '1d')
        }),
        map(d => {
          return d.data.absoluteNumber;
        })
      )
  }

}
