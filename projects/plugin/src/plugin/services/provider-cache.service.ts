import { PLATFORM_ID } from '@angular/core';
import { Storage } from '@ionic/storage';
import { WakoCacheService } from '@wako-app/mobile-sdk';

export class HeliosCacheService extends WakoCacheService {
  protected static storageEngine = new Storage(
    {
      name: 'wako_helios_cache'
    },
    PLATFORM_ID
  );
}
