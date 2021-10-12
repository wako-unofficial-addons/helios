import { WakoCacheService, WakoStorage } from '@wako-app/mobile-sdk';

export class HeliosCacheService extends WakoCacheService {
  protected static storageEngine = new WakoStorage(
    {
      name: 'wako_helios_cache'
    }
  );
}
