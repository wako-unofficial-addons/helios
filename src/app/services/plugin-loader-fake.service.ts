import { ComponentFactoryResolver, Injectable, Injector } from '@angular/core';
import { PluginBaseService, PluginDetail, PluginManifest, WakoBaseHttpService, WakoPluginLoaderService } from '@wako-app/mobile-sdk';
import { forkJoin, from, of, throwError } from 'rxjs';
import { catchError, mapTo, switchMap, tap } from 'rxjs/operators';
import { PluginModule } from '../../../projects/plugin/src/plugin/plugin.module';

@Injectable({
  providedIn: 'root'
})
export class PluginLoaderFakeService extends WakoPluginLoaderService {
  constructor(cfr: ComponentFactoryResolver, injector: Injector) {
    super(cfr, injector);
  }

  install(manifestUrl: string, lang: string, loadIt = true) {
    manifestUrl = manifestUrl.replace('/plugins/', '/');
    let pluginId = null;
    return WakoBaseHttpService.get<PluginManifest>(manifestUrl).pipe(
      switchMap((manifest) => {
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
          Object.keys(manifest.languages).forEach((langKey) => {
            const langUrl = manifest.languages[langKey].match('http') ? manifest.languages[langKey] : baseUrl + manifest.languages[langKey];

            const obs = WakoBaseHttpService.get(langUrl).pipe(
              catchError((err) => {
                console.error('Incorrect JSON: ' + langUrl, err);
                return throwError(err);
              }),
              tap((data) => {
                pluginDetail.languages[langKey] = data;
              })
            );

            obss.push(obs);
          });

          return forkJoin(obss).pipe(mapTo(pluginDetail));
        }

        return of(pluginDetail);
      }),
      switchMap((pluginDetail) => {
        return from(this.savePluginDetail(pluginDetail.manifest.id, pluginDetail));
      }),
      switchMap(() => {
        return from(this.addToList(pluginId));
      }),
      switchMap(() => {
        return this.load(pluginId, lang, true);
      }),
      tap(() => {
        this.loaded$.next(true);
        this.newPlugin$.next(true);
      })
    );
  }

  protected load<T>(pluginId: string, lang: string, isFirstLoad: boolean) {
    return from(this.getPluginDetail(pluginId)).pipe(
      tap((pluginDetail) => {
        const moduleType = PluginModule;

        const pluginService = this.injector.get(moduleType.pluginService) as PluginBaseService;

        this.pluginModuleMap.set(pluginDetail.manifest.id, {
          pluginDetail,
          moduleType: moduleType,
          injector: null
        });

        pluginService.initialize();

        if (isFirstLoad) {
          pluginService.afterInstall();
        }

        this.setLang(pluginId, lang);
      })
    );
  }

  getPluginService(pluginId: string): any {
    const plugin = this.pluginModuleMap.get(pluginId);
    if (plugin) {
      return this.injector.get(plugin.moduleType.pluginService) as PluginBaseService;
    }
    return null;
  }

  // createComponent(action: PluginAction, viewContainerRef: ViewContainerRef, data?: any) {
  //   return super.createComponent(action, viewContainerRef, data);
  //   // this.pluginModuleMap.forEach(pluginMap => {
  //   //   const moduleType = PluginModule;
  //   //
  //   //   if (action === 'movies' && pluginMap.pluginDetail.manifest.actions.includes(action) && moduleType.movieComponent) {
  //   //     const compFactory = this.cfr.resolveComponentFactory<MovieDetailBaseComponent>(moduleType.movieComponent);
  //   //     const movieComponent = viewContainerRef.createComponent<MovieDetailBaseComponent>(compFactory);
  //   //
  //   //     movieComponent.instance.setMovie(data.movie);
  //   //   } else if (action === 'shows' && pluginMap.pluginDetail.manifest.actions.includes(action) && moduleType.showComponent) {
  //   //     const compFactory = this.cfr.resolveComponentFactory<ShowDetailBaseComponent>(moduleType.showComponent);
  //   //     const episodeComponent = viewContainerRef.createComponent<ShowDetailBaseComponent>(compFactory);
  //   //
  //   //     episodeComponent.instance.setShowEpisode(data.show, data.episode);
  //   //   } else if (action === 'episodes' && pluginMap.pluginDetail.manifest.actions.includes(action) && moduleType.episodeComponent) {
  //   //     const compFactory = this.cfr.resolveComponentFactory<EpisodeDetailBaseComponent>(moduleType.episodeComponent);
  //   //     const episodeComponent = viewContainerRef.createComponent<EpisodeDetailBaseComponent>(compFactory);
  //   //
  //   //     episodeComponent.instance.setShowEpisode(data.show, data.episode);
  //   //   } else if (action === 'settings' && moduleType.settingsComponent) {
  //   //     const compFactory = this.cfr.resolveComponentFactory<any>(moduleType.settingsComponent);
  //   //     viewContainerRef.createComponent<any>(compFactory);
  //   //   } else if (action === 'plugin-detail' && moduleType.pluginDetailComponent) {
  //   //     const compFactory = this.cfr.resolveComponentFactory<any>(moduleType.pluginDetailComponent);
  //   //     viewContainerRef.createComponent<any>(compFactory);
  //   //   }
  //   // });
  // }
}
