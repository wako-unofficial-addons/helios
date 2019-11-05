import { ComponentFactoryResolver, Injectable, Injector, ViewContainerRef } from '@angular/core';

import {
  EpisodeDetailBaseComponent, EpisodeItemOptionBaseComponent,
  MovieDetailBaseComponent,
  PluginAction,
  PluginBaseService,
  PluginDetail,
  PluginManifest,
  PluginModuleMap,
  WakoBaseHttpService
} from '@wako-app/mobile-sdk';
import { forkJoin, from, of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { Storage } from '@ionic/storage';
import { catchError, mapTo, switchMap, tap } from 'rxjs/operators';
import { PluginModule } from '../../../projects/plugin/src/plugin/plugin.module';

@Injectable({
  providedIn: 'root'
})
export class PluginLoaderFakeService {
  private pluginModuleMap = new Map<string, PluginModuleMap>();

  constructor(
    private translateService: TranslateService,
    private storage: Storage,
    private injector: Injector,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {
    console.log('PluginLoaderFakeService');
  }

  install(manifestUrl: string, lang: string) {
    manifestUrl = manifestUrl.replace('/plugins/', '/');
    let pluginId = null;
    return WakoBaseHttpService.get<PluginManifest>(manifestUrl).pipe(
      switchMap(manifest => {
        manifest.url = manifestUrl;

        pluginId = manifest.id;

        const paths = manifestUrl.split('/');
        paths.pop();
        const baseUrl = paths.join('/');

        const pluginDetail = new PluginDetail();

        pluginDetail.manifestUrl = manifestUrl;
        pluginDetail.manifest = manifest;

        pluginDetail.source = null;

        if (manifest.languages) {
          pluginDetail.languages = {};
          const obss = [];
          Object.keys(manifest.languages).forEach(langKey => {
            const langUrl = manifest.languages[langKey].match('http') ? manifest.languages[langKey] : baseUrl + manifest.languages[langKey];

            const obs = WakoBaseHttpService.get(langUrl).pipe(
              catchError(err => {
                console.error('Incorrect JSON: ' + langUrl, err);
                return throwError(err);
              }),
              tap(data => {
                pluginDetail.languages[langKey] = data;
              })
            );

            obss.push(obs);
          });

          return forkJoin(obss).pipe(mapTo(pluginDetail));
        }

        return of(pluginDetail);
      }),
      switchMap(pluginDetail => {
        return from(this.savePluginDetail(pluginDetail.manifest.id, pluginDetail));
      }),
      switchMap(() => {
        return from(this.addToList(pluginId));
      }),
      switchMap(() => {
        return this.load(pluginId, lang, true);
      })
    );
  }

  private savePluginDetail(pluginId: string, pluginDetail: PluginDetail) {
    return this.storage.set(pluginId, pluginDetail);
  }

  private getPluginDetail(pluginId: string) {
    return this.storage.get(pluginId) as Promise<PluginDetail>;
  }

  private getAllInstalled(): Promise<string[]> {
    return this.storage.get('plugin_list').then(data => {
      if (!data) {
        data = [];
      }
      return data;
    });
  }

  private addToList(pluginId: string) {
    return from(this.getAllInstalled()).pipe(
      switchMap(list => {
        if (list.includes(pluginId)) {
          return of(true);
        }
        list.push(pluginId);
        return from(this.storage.set('plugin_list', list));
      })
    );
  }

  private load<T>(pluginId: string, lang: string, isFirstLoad: boolean) {
    return from(this.getPluginDetail(pluginId)).pipe(
      tap(pluginDetail => {
        const moduleType = PluginModule;

        const pluginService = this.injector.get(moduleType.pluginService) as PluginBaseService;

        this.pluginModuleMap.set(pluginDetail.manifest.id, {
          pluginDetail,
          moduleFactory: null,
          moduleRef: null
        });

        pluginService.initialize();

        if (isFirstLoad) {
          pluginService.afterInstall();
        }

        this.setLang(pluginId, lang);
      })
    );
  }

  setLang(pluginId: string, lang: string) {
    const pluginModule = this.pluginModuleMap.get(pluginId);

    const moduleType = PluginModule;

    const pluginService = this.injector.get(moduleType.pluginService) as PluginBaseService;

    if (pluginModule.pluginDetail.languages.hasOwnProperty(lang)) {
      pluginService.setTranslation(lang, pluginModule.pluginDetail.languages[lang]);
    }
  }

  createComponent(action: PluginAction, viewContainerRef: ViewContainerRef, data?: any) {
    this.pluginModuleMap.forEach(pluginMap => {
      const moduleType = PluginModule;

      if (action === 'movies' && pluginMap.pluginDetail.manifest.actions.includes(action) && moduleType.movieComponent) {
        const compFactory = this.componentFactoryResolver.resolveComponentFactory<MovieDetailBaseComponent>(moduleType.movieComponent);
        const movieComponent = viewContainerRef.createComponent<MovieDetailBaseComponent>(compFactory);

        movieComponent.instance.setMovie(data.movie);
      } else if (action === 'episodes' && pluginMap.pluginDetail.manifest.actions.includes(action) && moduleType.episodeComponent) {
        const compFactory = this.componentFactoryResolver.resolveComponentFactory<EpisodeDetailBaseComponent>(moduleType.episodeComponent);
        const episodeComponent = viewContainerRef.createComponent<EpisodeDetailBaseComponent>(compFactory);

        episodeComponent.instance.setShowEpisode(data.show, data.episode);
      } else if (action === 'settings' && moduleType.settingsComponent) {
        const compFactory = this.componentFactoryResolver.resolveComponentFactory<any>(moduleType.settingsComponent);
        viewContainerRef.createComponent<any>(compFactory);
      } else if (action === 'plugin-detail' && moduleType.pluginDetailComponent) {
        const compFactory = this.componentFactoryResolver.resolveComponentFactory<any>(moduleType.pluginDetailComponent);
        viewContainerRef.createComponent<any>(compFactory);
      } else if (
        action === 'episodes-item-option' &&
        pluginMap.pluginDetail.manifest.actions.includes(action) &&
        moduleType.episodeItemOptionComponent
      ) {
        const compFactory = this.componentFactoryResolver.resolveComponentFactory<EpisodeItemOptionBaseComponent>(
          moduleType.episodeItemOptionComponent
        );
        const episodeComponent = viewContainerRef.createComponent<EpisodeItemOptionBaseComponent>(compFactory);

        episodeComponent.instance.setShowEpisode(data.show, data.episode);
      }
    });
  }
}
