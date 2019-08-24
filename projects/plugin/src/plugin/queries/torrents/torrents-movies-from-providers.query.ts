import { Movie } from '@wako-app/mobile-sdk';
import { Provider } from '../../entities/provider';
import { forkJoin, of } from 'rxjs';
import { TorrentsFromProviderBaseQuery } from './torrents-from-provider-base.query';
import { map, switchMap, tap } from 'rxjs/operators';
import { SourceQuery } from '../../entities/source-query';
import { HeliosCacheService } from '../../services/provider-cache.service';
import { TorrentSource } from '../../entities/torrent-source';

export class TorrentsMoviesFromProvidersQuery extends TorrentsFromProviderBaseQuery {

  static getSourceQuery(movie: Movie) {
    const sourceQuery = new SourceQuery();

    sourceQuery.imdbId = movie.imdbId;
    sourceQuery.title = movie.title;
    sourceQuery.alternativeTitles = movie.alternativeTitles;
    sourceQuery.originalTitle = movie.originalTitle;
    sourceQuery.year = movie.year;
    return sourceQuery
  }

  static getByProvider(movie: Movie, provider: Provider) {
    if (!provider.movie) {
      return of([]);
    }

    return super.getTorrents(provider, this.getSourceQuery(movie), provider.movie);
  }

  static getData(movie: Movie, providers: Provider[]) {
    const cacheKey = 'helios_getmovie_' + (movie.imdbId || movie.traktId);

    return HeliosCacheService.get<TorrentSource[]>(cacheKey)
      .pipe(
        switchMap(cachedTorrents => {

          if (cachedTorrents) {
            return of(cachedTorrents);
          }


          const obss = [];

          let allTorrents: TorrentSource[] = [];

          let total = 0;
          providers.forEach(provider => {

            obss.push(
              this.getByProvider(movie, provider).pipe(
                tap(torrents => {
                  total++;
                  console.log("DONE", total, '/', providers.length);
                  allTorrents = allTorrents.concat(torrents);
                })
              )
            );
          });

          if (obss.length === 0) {
            console.error('Oups no obss, check this');
            return of([]);
          }

          return forkJoin(...obss).pipe(
            map(() => {
              return allTorrents;
            }),
            tap(torrents => {
              HeliosCacheService.set(cacheKey, torrents, '1h');
            })
          );
        })
      )
  }
}
