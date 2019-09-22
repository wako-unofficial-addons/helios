import { Observable, throwError } from 'rxjs';
import { WakoBaseHttpService, WakoHttpError } from '@wako-app/mobile-sdk';
import { HeliosCacheService } from './provider-cache.service';
import { logData } from './tools';

declare const cordova: any;

export class ProviderHttpService extends WakoBaseHttpService {
  static byPassCors = true;

  static queueEnabled = true;

  static getSimultaneousRequest() {
    return 20;
  }

  static getCacheService() {
    return HeliosCacheService;
  }

  static handleError(err) {
    if (err instanceof WakoHttpError && err.status === 503 && err.response.match('Ray ID')) {
      return this.cfBypasser(err);
    }

    logData('ProviderHttp err', err);
    if (err instanceof WakoHttpError) {
      logData('METHOD: ' + err.request.method);
      logData('URL: ' + err.request.url);
    }

    return throwError(err);
  }

  private static cfBypasser(err: WakoHttpError) {
    if (!cordova['InAppBrowser']) {
      return throwError(err);
    }

    return new Observable(observer => {
      let timer = null;

      logData('CF - Bypassing', err.request.url);
      const inAppRef = cordova['InAppBrowser'].open(err.request.url, '_blank', 'location=yes,hidden=yes');

      inAppRef.addEventListener('loadstop', () => {
        inAppRef.executeScript(
          {
            code: "document.getElementsByTagName('html')[0].innerHTML"
          },
          htmls => {
            const html: string = htmls.pop();
            if (typeof html === 'string' && html.match('Ray ID') === null) {
              logData('CF - Bypassed', html);
              // not cloudflare anymore
              clearTimeout(timer);
              inAppRef.close();
              observer.next(html);
              observer.complete();
            }
          }
        );
      });

      timer = setTimeout(() => {
        inAppRef.close();
        observer.error(err);
      }, 10000);
    });
  }
}
