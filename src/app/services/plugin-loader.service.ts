import { ComponentFactoryResolver, Injectable, Injector } from '@angular/core';
import { WakoPluginLoaderService } from '@wako-app/mobile-sdk';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class PluginLoaderService extends WakoPluginLoaderService {
  constructor(cfr: ComponentFactoryResolver, injector: Injector) {
    super(cfr, injector);
  }
}
