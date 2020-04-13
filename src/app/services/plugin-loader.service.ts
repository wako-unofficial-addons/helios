import { ComponentFactoryResolver, Injectable, Injector } from '@angular/core';
import { WakoPluginLoaderService } from '@wako-app/mobile-sdk';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class PluginLoaderService extends WakoPluginLoaderService {
  constructor(storage: Storage, cfr: ComponentFactoryResolver, injector: Injector) {
    super(storage, cfr, injector);
  }
}
