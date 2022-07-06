import { Injectable, Injector } from '@angular/core';
import { WakoPluginLoaderService } from '@wako-app/mobile-sdk';

@Injectable({
  providedIn: 'root',
})
export class PluginLoaderService extends WakoPluginLoaderService {
  constructor(injector: Injector) {
    super(injector);
  }
}
