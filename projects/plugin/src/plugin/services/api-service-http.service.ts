import { WakoBaseHttpService } from '@wako-app/mobile-sdk';
import { HeliosCacheService } from './provider-cache.service';

export class ApiServicesHttpService extends WakoBaseHttpService {
  static byPassCors = false;

  static queueEnabled = true;

  static getSimultaneousRequest() {
    return 20;
  }

  static getCacheService() {
    return HeliosCacheService;
  }
}
