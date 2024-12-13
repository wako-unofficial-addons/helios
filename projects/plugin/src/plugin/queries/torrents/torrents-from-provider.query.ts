import { WakoHttpError } from '@wako-app/mobile-sdk';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Provider, ProviderResponse, testProviders } from '../../entities/provider';
import { SourceQuery } from '../../entities/source-query';
import { TorrentSourceDetail } from '../../entities/torrent-source-detail';
import { HeliosCacheService } from '../../services/provider-cache.service';
import { logData } from '../../services/tools';
import { TorrentsFromProviderBaseQuery } from './torrents-from-provider-base.query';

export class TorrentsFromProviderQuery extends TorrentsFromProviderBaseQuery {
  private static getMovies(sourceQuery: SourceQuery, provider: Provider) {
    return super.getTorrents(provider, sourceQuery, provider.movie);
  }

  private static getEpisodes(sourceQuery: SourceQuery, provider: Provider) {
    let episodeProviderResponses: ProviderResponse[] = [];
    // Get episodes
    return super.getTorrents(provider, sourceQuery, provider.episode).pipe(
      switchMap((providerResponses) => {
        episodeProviderResponses = episodeProviderResponses.concat(providerResponses);
        // Get season pack
        if (!provider.season) {
          return of([]);
        }
        return super.getTorrents(provider, sourceQuery, provider.season);
      }),
      map((packProviderResponses) => {
        return episodeProviderResponses.concat(packProviderResponses);
      }),
    );
  }

  private static getAnimes(sourceQuery: SourceQuery, provider: Provider) {
    let episodeProviderResponses: ProviderResponse[] = [];
    // Get episodes
    return super.getTorrents(provider, sourceQuery, provider.anime).pipe(
      switchMap((providerResponses) => {
        episodeProviderResponses = episodeProviderResponses.concat(providerResponses);
        // Get season pack
        if (!provider.season) {
          return of([]);
        }
        return super.getTorrents(provider, sourceQuery, provider.season);
      }),
      map((packProviderResponses) => {
        return episodeProviderResponses.concat(packProviderResponses);
      }),
    );
  }

  static getData(sourceQuery: SourceQuery, provider: Provider) {
    if (sourceQuery.category === 'movie' && !provider.movie) {
      return throwError(`Prodiver ${provider.name} doesn't handle category ${sourceQuery.category}`);
    }

    if (sourceQuery.category === 'tv' && !provider.episode && !provider.season) {
      return throwError(`Prodiver ${provider.name} doesn't handle category ${sourceQuery.category}`);
    }

    if (sourceQuery.category === 'anime' && !provider.anime) {
      return throwError(`Prodiver ${provider.name} doesn't handle category ${sourceQuery.category}`);
    }

    const cacheKey = 'helios_v1_' + provider.name + '_' + JSON.stringify(sourceQuery);

    return HeliosCacheService.get<TorrentSourceDetail>(cacheKey).pipe(
      switchMap((cache) => {
        console.log('DOING', provider.name);

        const startTime = Date.now();

        if (Object.keys(testProviders).length > 0) {
          console.log('You are using the test providers, cache is now disabled');
          cache = null;
        }

        if (cache) {
          return of(cache);
        }

        let obs: Observable<ProviderResponse[]>;

        if (sourceQuery.category === 'movie') {
          obs = this.getMovies(sourceQuery, provider);
        } else if (sourceQuery.category === 'tv') {
          obs = this.getEpisodes(sourceQuery, provider);
        } else if (sourceQuery.category === 'anime') {
          obs = this.getAnimes(sourceQuery, provider);
        }

        const torrentSourceDetail = new TorrentSourceDetail();
        torrentSourceDetail.provider = provider.name;

        return obs.pipe(
          catchError((err) => {
            let errorMessage = '';
            if (typeof err === 'string') {
              errorMessage = err;
            } else if (err instanceof WakoHttpError && err.status) {
              errorMessage = err.status.toString();
            } else if (err.message) {
              errorMessage = err.message;
            } else {
              errorMessage = JSON.stringify(err);
            }
            torrentSourceDetail.errorMessage = errorMessage;
            return of([]);
          }),
          map((providerResponses: ProviderResponse[]) => {
            const endTime = Date.now();

            torrentSourceDetail.sources = providerResponses.flatMap((providerResponse) => {
              return providerResponse.torrents;
            });
            torrentSourceDetail.providerResponses = providerResponses;
            torrentSourceDetail.timeElapsed = endTime - startTime;

            const errorMessages = [];
            for (const providerResponse of providerResponses) {
              if (providerResponse.error != undefined) {
                errorMessages.push(providerResponse.error);
              }
            }
            if (errorMessages.length > 0) {
              torrentSourceDetail.errorMessage = errorMessages.join('\n');
            }

            let allSkipped = false;
            for (const providerResponse of providerResponses) {
              if (providerResponse.skippedReason) {
                allSkipped = true;
              }
            }

            torrentSourceDetail.skipped = allSkipped;

            HeliosCacheService.set(cacheKey, torrentSourceDetail, '1h');

            return torrentSourceDetail;
          }),
        );
      }),
      tap((torrentSourceDetail) => {
        logData(
          `${torrentSourceDetail.provider} - ${torrentSourceDetail.sources.length} torrents found in ${torrentSourceDetail.timeElapsed} ms`,
        );
      }),
    );
  }
}
