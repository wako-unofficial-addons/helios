import { Injectable } from '@angular/core';
import { KodiAppService, PluginLoaderService } from '@wako-app/mobile-sdk';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  constructor(protected pluginLoader: PluginLoaderService) {

    KodiAppService.currentHost = {
      name: 'MyHost',
      host: '127.0.0.1',
      port: 8080
    };
  }

  loadPlugins() {
    return this.pluginLoader.install('/assets/plugins/manifest.json', 'en');
  }
}
