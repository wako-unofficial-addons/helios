import { Episode, Show } from '@wako-app/mobile-sdk';
import { Provider } from '../../entities/provider';
import { forkJoin, of } from 'rxjs';
import { TorrentsFromProviderBaseQuery } from './torrents-from-provider-base.query';
import { map, switchMap, tap } from 'rxjs/operators';
import { SourceEpisodeQuery } from '../../entities/source-query';
import { add0 } from '../../services/tools';
import { HeliosCacheService } from '../../services/provider-cache.service';
import { TorrentSource } from '../../entities/torrent-source';

export class TorrentsEpisodesFromProvidersQuery extends TorrentsFromProviderBaseQuery {

  static getSourceQuery(show: Show, episode: Episode) {
    const sourceQuery = new SourceEpisodeQuery();

    sourceQuery.episodeNumber = episode.traktNumber;
    sourceQuery.seasonNumber = episode.traktSeasonNumber;
    sourceQuery.episodeCode = episode.code;
    sourceQuery.seasonCode = 'S' + add0(episode.traktSeasonNumber).toString();
    sourceQuery.imdbId = episode.imdbId;
    sourceQuery.title = show.title;
    sourceQuery.alternativeTitles = show.alternativeTitles;
    sourceQuery.originalTitle = show.originalTitle;
    sourceQuery.year = show.year;

    return sourceQuery;
  }

  static getByProvider(show: Show, episode: Episode, provider: Provider) {

    const sourceQuery = this.getSourceQuery(show, episode);

    const providerInfo = show.genres.includes('anime') ? (provider.anime ? provider.anime : provider.episode) : provider.episode;
    if (!providerInfo) {
      return of([]);
    }

    let episodeTorrents: TorrentSource[] = [];
    // Get episodes
    return super.getTorrents(provider, sourceQuery, providerInfo)
      .pipe(
        switchMap(torrents => {
          episodeTorrents = episodeTorrents.concat(torrents);
          // Get season pack
          if (!provider.season) {
            return of([]);
          }
          return super.getTorrents(provider, sourceQuery, provider.season)
            .pipe(
              map(packTorrents => {
                // get only filename with SXX no episode

                return packTorrents.filter(torrent => {
                  if (torrent.title.match(/(S[0-9]+)/i) && !torrent.title.match(/([0-9]E[^0-9]?[0-9]+)/i)) {
                    torrent.isPackage = true;
                  }
                  return torrent.isPackage;
                })
              })
            )
        }),
        map(packTorrents => {
          return episodeTorrents.concat(packTorrents);
        })
      );
  }

  static getData(show: Show, episode: Episode, providers: Provider[]) {

    const cacheKey = 'helios_getepisode_' + show.traktId + '_' + episode.code;

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
              this.getByProvider(show, episode, provider).pipe(
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
