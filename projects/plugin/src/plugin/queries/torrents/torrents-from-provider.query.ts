import { Provider } from '../../entities/provider';
import { Observable, of, throwError } from 'rxjs';
import { TorrentsFromProviderBaseQuery } from './torrents-from-provider-base.query';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { SourceQuery } from '../../entities/source-query';
import { HeliosCacheService } from '../../services/provider-cache.service';
import { TorrentSource } from '../../entities/torrent-source';
import { logData } from '../../services/tools';
import { TorrentSourceDetail } from '../../entities/torrent-source-detail';
import { WakoHttpError } from '@wako-app/mobile-sdk';

export class TorrentsFromProviderQuery extends TorrentsFromProviderBaseQuery {
  private static getMovies(sourceQuery: SourceQuery, provider: Provider) {
    return super.getTorrents(provider, sourceQuery, provider.movie);
  }

  private static getEpisodes(sourceQuery: SourceQuery, provider: Provider) {
    let episodeTorrents: TorrentSource[] = [];
    // Get episodes
    return super.getTorrents(provider, sourceQuery, provider.episode).pipe(
      switchMap((torrents) => {
        episodeTorrents = episodeTorrents.concat(torrents);
        // Get season pack
        if (!provider.season) {
          return of([]);
        }
        return super.getTorrents(provider, sourceQuery, provider.season);
      }),
      map((packTorrents) => {
        return episodeTorrents.concat(packTorrents);
      })
    );
  }

  private static getAnimes(sourceQuery: SourceQuery, provider: Provider) {
    let episodeTorrents: TorrentSource[] = [];
    // Get episodes
    return super.getTorrents(provider, sourceQuery, provider.anime).pipe(
      switchMap((torrents) => {
        episodeTorrents = episodeTorrents.concat(torrents);
        // Get season pack
        if (!provider.season) {
          return of([]);
        }
        return super.getTorrents(provider, sourceQuery, provider.season);
      }),
      map((packTorrents) => {
        return episodeTorrents.concat(packTorrents);
      })
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

    const cacheKey = 'helios_' + provider.name + '_' + JSON.stringify(sourceQuery);

    const startTime = Date.now();
    return HeliosCacheService.get<TorrentSourceDetail>(cacheKey).pipe(
      switchMap((cache) => {
        console.log('DOING', provider.name);

        if (cache) {
          return of(cache);
        }

        let obs: Observable<TorrentSource[]>;

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
          map((torrents) => {
            const endTime = Date.now();

            torrentSourceDetail.sources = torrents;
            torrentSourceDetail.timeElapsed = endTime - startTime;

            HeliosCacheService.set(cacheKey, torrentSourceDetail, '1h');

            return torrentSourceDetail;
          })
        );
      }),
      tap((torrentSourceDetail) => {
        logData(
          `${torrentSourceDetail.provider} - ${torrentSourceDetail.sources.length} torrents found in ${torrentSourceDetail.timeElapsed} ms`
        );
      })
    );
  }
}
