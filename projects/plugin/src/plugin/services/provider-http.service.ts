import { throwError } from 'rxjs';
import { WakoBaseHttpService, WakoHttpError } from '@wako-app/mobile-sdk';
import { HeliosCacheService } from './provider-cache.service';
import { logData } from './tools';

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
    console.log('ProviderHttp err', err);
    if (err instanceof WakoHttpError) {
      logData('METHOD: ' + err.request.method);
      logData('URL: ' + err.request.url);
    }
    return throwError(err);
  }
}
