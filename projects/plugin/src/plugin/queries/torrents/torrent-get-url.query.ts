import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProviderHttpService } from '../../services/provider-http.service';
import { getDomainFromUrl } from '@wako-app/mobile-sdk';

export class TorrentGetUrlQuery {
  static getData(url: string, subPageUrl?: string): Observable<string> {
    if (!subPageUrl) {
      return of(url);
    }

    return ProviderHttpService.request<string>(
      {
        method: 'GET',
        url: subPageUrl,
        responseType: 'text'
      },
      '1d',
      10000,
      true
    ).pipe(
      catchError(() => {
        return of(null);
      }),
      map(_html => {
        if (!_html) {
          return null;
        }

        if (_html.match(/(magnet[^"]+)/)) {
          return _html.match(/(magnet[^"]+)/).shift();
        }
        if (_html.match(/http(.*?).torrent["\']/)) {
          return 'http' + _html.match(/http(.*?).torrent["\']/).shift() + '.torrent';
        }
        if (_html.match(/href="(.*?).torrent["\']/)) {
          const torrentUrl = _html.match(/href="(.*?).torrent["\']/).pop() + '.torrent';
          if (torrentUrl.match('http') !== null) {
            return torrentUrl;
          }

          const domain = getDomainFromUrl(subPageUrl);

          let url = (subPageUrl.match('https') !== null ? 'https://' : 'http://') + domain;

          url += torrentUrl[0] === '/' ? torrentUrl : '/' + torrentUrl;
          return url;
        }
        return null;
      })
    );
  }
}
