import { Injectable } from '@angular/core';
import { Episode, EventAction, EventCategory, EventService, Movie, Show, ToastService } from '@wako-app/mobile-sdk';
import { catchError, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { CachedTorrentSourceService } from './cached-torrent-source.service';
import { TorrentSourceService } from './torrent-source.service';
import { SourceQuery } from '../../entities/source-query';
import { HeliosCacheService } from '../provider-cache.service';
import { addToKodiPlaylist, getSourceQueryEpisode, getSourceQueryMovie, incrementEpisodeCode } from '../tools';
import { concat, EMPTY, forkJoin, from, merge, Observable, of, Subject } from 'rxjs';
import { SettingsService } from '../settings.service';
import { Provider } from '../../entities/provider';
import { SourceByProvider } from '../../entities/source-by-provider';
import { ProviderService } from '../provider.service';
import { LastPlayedSource } from '../../entities/last-played-source';
import { StreamLinkSource } from '../../entities/stream-link-source';
import { TorrentsFilterOnWantedQualityQuery } from '../../queries/torrents/torrents-filter-on-wanted-quality.query';
import { Settings } from '../../entities/settings';
import { TorrentSource } from '../../entities/torrent-source';
import { StreamLinkSourceDetail } from '../../entities/stream-link-source-detail';
import { TvdbService } from '../tvdb.service';
import { KodiOpenMedia } from '../../entities/kodi-open-media';

const GET_LAST_MOVIE_PLAYED_SOURCE_CACHE_KEY = 'helios_previousplayed_movie2';
const GET_LAST_SHOW_PLAYED_SOURCE_CACHE_KEY = 'helios_previousplayed_show2';

@Injectable()
export class SourceService {
  constructor(
    private cachedTorrentSourceService: CachedTorrentSourceService,
    private torrentSourceService: TorrentSourceService,
    private settingsService: SettingsService,
    private providerService: ProviderService,
    private tvdbService: TvdbService,
    private toastService: ToastService
  ) {
    EventService.subscribe<KodiOpenMedia>(EventCategory.kodi, 'playEpisode').subscribe((data: EventAction<KodiOpenMedia>) => {
      this.getSourceQueryFromKodiOpenMedia(data.data).subscribe(sourceQuery => {

        const limit = 3;

        const obss: Observable<TorrentSource | StreamLinkSource>[] = [];
        let episodeCode = sourceQuery.episode.episodeCode;
        let episodeAbsoluteNumber = sourceQuery.episode.absoluteNumber;
        let episodeNumber = sourceQuery.episode.episodeNumber;

        for (let i = 0; i < limit; i++) {
          const _sourceQuery = JSON.parse(JSON.stringify(sourceQuery));
          episodeCode = incrementEpisodeCode(episodeCode);

          if (episodeAbsoluteNumber) {
            episodeAbsoluteNumber++;
            _sourceQuery.episode.absoluteNumber = episodeAbsoluteNumber;
          }
          episodeNumber++;
          _sourceQuery.episode.episodeNumber = episodeNumber;

          _sourceQuery.episode.episodeCode = episodeCode;

          obss.push(this.getBestSource(_sourceQuery, true));
        }

        const stop$ = new Subject();

        let added = false;

        let totalAdded = 0;
        concat(...obss)
          .pipe(
            takeUntil(stop$),
            finalize(() => {
              if (totalAdded > 0) {
                this.toastService.simpleMessage('sources.addToQueue', {totalEpisode: totalAdded});
              }
            }),
            switchMap((source: StreamLinkSource) => {
              if (source === null) {
                return EMPTY;
              }

              if (!source.streamLinks || (source.streamLinks.length > 1 && added)) {
                stop$.next(true);
                return EMPTY;
              }

              added = true;

              totalAdded += source.streamLinks.length;

              const videoUrls = [];
              source.streamLinks.forEach(link => {
                videoUrls.push(link.url);
              });

              return addToKodiPlaylist(videoUrls, data.data);
            })
          )
          .subscribe();
      });
    });
  }

  private getByProvider(sourceQuery: SourceQuery, provider: Provider) {
    return this.torrentSourceService.getByProvider(sourceQuery, provider).pipe(
      switchMap(torrentSourceDetail => {
        return from(this.settingsService.get()).pipe(
          switchMap(settings => {
            if (sourceQuery.movie || sourceQuery.episode) {
              torrentSourceDetail.sources = TorrentsFilterOnWantedQualityQuery.getData(torrentSourceDetail.sources, settings.qualities);
            }

            const startTime = Date.now();
            return this.cachedTorrentSourceService.getFromTorrents(torrentSourceDetail.sources, sourceQuery).pipe(
              map(streamLinks => {
                const endTime = Date.now();

                const streamLinkSourceDetail = new StreamLinkSourceDetail();

                streamLinkSourceDetail.provider = provider.name;
                streamLinkSourceDetail.sources = streamLinks;
                streamLinkSourceDetail.timeElapsed = endTime - startTime;

                return {
                  provider: provider.name,
                  torrentSourceDetail: torrentSourceDetail,
                  cachedTorrentDetail: streamLinkSourceDetail,
                  timeElapsedTotal: torrentSourceDetail.timeElapsed + streamLinkSourceDetail.timeElapsed
                } as SourceByProvider;
              })
            );
          })
        );
      })
    );
  }

  getLastMoviePlayedSource() {
    return HeliosCacheService.get<LastPlayedSource>(GET_LAST_MOVIE_PLAYED_SOURCE_CACHE_KEY);
  }

  async setLastMoviePlayedSource(id: string, title: string, provider: string) {
    return await HeliosCacheService.set(
      GET_LAST_MOVIE_PLAYED_SOURCE_CACHE_KEY,
      {
        id,
        title,
        provider
      } as LastPlayedSource,
      '1m'
    );
  }

  getLastEpisodePlayedSource(showTraktId: number) {
    return HeliosCacheService.get<LastPlayedSource>(GET_LAST_SHOW_PLAYED_SOURCE_CACHE_KEY + '_' + showTraktId).pipe(
      switchMap(data => {
        if (!data) {
          return HeliosCacheService.get<LastPlayedSource>(GET_LAST_SHOW_PLAYED_SOURCE_CACHE_KEY);
        }
        return of(data);
      })
    );
  }

  async setLastEpisodePlayedSource(id: string, title: string, provider: string, showTraktId: number) {
    await HeliosCacheService.set(
      GET_LAST_SHOW_PLAYED_SOURCE_CACHE_KEY + '_' + showTraktId,
      {
        id,
        title,
        provider,
        showTraktId
      } as LastPlayedSource,
      '1m'
    );

    return await HeliosCacheService.set(
      GET_LAST_SHOW_PLAYED_SOURCE_CACHE_KEY,
      {
        id,
        title,
        provider,
        showTraktId
      } as LastPlayedSource,
      '1m'
    );
  }

  private getBestSourceFromSourceByProviders(
    sourceQuery: SourceQuery,
    sourceByProviders: SourceByProvider[],
    settings: Settings,
    lastPlayedSource: LastPlayedSource
  ) {
    if (settings.defaultPlayButtonAction === 'open-elementum') {
      const torrentSources: TorrentSource[] = [];

      sourceByProviders.forEach(sourceByProvider => {
        torrentSources.push(...sourceByProvider.torrentSourceDetail.sources);
      });

      const source = this.torrentSourceService.getBestSource(torrentSources, lastPlayedSource);

      return of(source);
    }
    const streamLinkSources: StreamLinkSource[] = [];

    sourceByProviders.forEach(sourceByProvider => {
      streamLinkSources.push(...sourceByProvider.cachedTorrentDetail.sources);
    });

    return this.cachedTorrentSourceService.getBestSource(streamLinkSources, sourceQuery, lastPlayedSource);
  }

  private getBestSourcesObservables(
    sourceQuery: SourceQuery,
    providers: Provider[],
    settings: Settings,
    lastPlayedSource: LastPlayedSource,
    totalProviderInSequence = 4
  ) {
    // Let's proceed X providers by X providers
    let obss: Observable<SourceByProvider>[] = [];
    let groupObss: Observable<TorrentSource | StreamLinkSource>[] = [];

    providers.forEach(provider => {
      if (lastPlayedSource && provider.name === lastPlayedSource.provider) {
        groupObss.unshift(
          this.getByProvider(sourceQuery, provider).pipe(
            switchMap(sourceByProvider => {
              return this.getBestSourceFromSourceByProviders(sourceQuery, [sourceByProvider], settings, lastPlayedSource);
            })
          )
        );
        return;
      }
      obss.push(this.getByProvider(sourceQuery, provider));
      if (typeof totalProviderInSequence === 'number' && obss.length % totalProviderInSequence === 0) {
        groupObss.push(
          forkJoin(...obss).pipe(
            switchMap(sourceByProviders => {
              return this.getBestSourceFromSourceByProviders(sourceQuery, sourceByProviders, settings, lastPlayedSource);
            })
          )
        );
        obss = [];
      }
    });

    if (obss.length > 0) {
      groupObss.push(
        forkJoin(...obss).pipe(
          switchMap(sourceByProviders => {
            return this.getBestSourceFromSourceByProviders(sourceQuery, sourceByProviders, settings, lastPlayedSource);
          })
        )
      );
    }

    return groupObss;
  }

  private getEpisodeAbsoluteNumberIfAnime(sourceQuery: SourceQuery) {
    if (!sourceQuery.episode || !sourceQuery.episode.isAnime || sourceQuery.episode.absoluteNumber > 0) {
      return of(null);
    }
    return this.tvdbService.getEpisode(sourceQuery.episode.tvdbId).pipe(
      catchError(() => {
        return of(null);
      })
    );
  }

  private getBestSource(sourceQuery: SourceQuery, stopIfFirstSourceIsNull = false) {
    let getLatestPlayedSource: Observable<LastPlayedSource> = null;
    if (sourceQuery.movie) {
      getLatestPlayedSource = this.getLastMoviePlayedSource();
    } else {
      getLatestPlayedSource = this.getLastEpisodePlayedSource(sourceQuery.episode.showTraktId);
    }

    let settings: Settings;
    let providers: Provider[];
    let done = 0;
    let totalToDo = 0;
    return new Observable<TorrentSource | StreamLinkSource>(observer => {
      let bestSourceReturned$ = new Subject();

      from(this.settingsService.get())
        .pipe(
          switchMap(d => {
            settings = d;
            return from(this.providerService.getAll(true, sourceQuery.category));
          }),
          switchMap(d => {
            providers = d;
            return getLatestPlayedSource;
          }),
          switchMap(lastPlayedSource => {
            const groupObss = this.getBestSourcesObservables(sourceQuery, providers, settings, lastPlayedSource, 4);

            totalToDo = groupObss.length;

            return concat(...groupObss).pipe(
              takeUntil(bestSourceReturned$),
              tap(() => {
                done++;
              })
            );
          })
        )
        .subscribe(
          bestSource => {
            if (bestSource || stopIfFirstSourceIsNull) {
              bestSourceReturned$.next(true);

              observer.next(bestSource);
              observer.complete();

              if (bestSource) {
                if (sourceQuery.movie) {
                  this.setLastMoviePlayedSource(bestSource.id, bestSource.title, bestSource.provider);
                } else {
                  this.setLastEpisodePlayedSource(bestSource.id, bestSource.title, bestSource.provider, sourceQuery.episode.showTraktId);
                }
              }
            }

            if (done === totalToDo && !bestSource) {
              observer.next(bestSource);
              observer.complete();
            }
          },
          err => observer.error(err)
        );
    });
  }


  getBestSourceFromKodiOpenMedia(kodiOpenMedia: KodiOpenMedia) {
    return this.getSourceQueryFromKodiOpenMedia(kodiOpenMedia)
      .pipe(
        switchMap(sourceQuery => {
          return this.getBestSource(sourceQuery);
        })
      )
  }

  getAll(sourceQuery: SourceQuery) {
    if (sourceQuery.query && sourceQuery.query.trim().length === 0) {
      return EMPTY;
    }

    let providers: Provider[];

    return this.getEpisodeAbsoluteNumberIfAnime(sourceQuery).pipe(
      switchMap(absoluteNumber => {
        if (absoluteNumber) {
          sourceQuery.episode.absoluteNumber = absoluteNumber;
        }
        return from(this.providerService.getAll(true, sourceQuery.category));
      }),
      switchMap(d => {
        providers = d;
        const obss: Observable<SourceByProvider>[] = [];
        providers.forEach(provider => {
          obss.push(this.getByProvider(sourceQuery, provider));
        });
        return merge(...obss);
      })
    );
  }

  getSourceQueryFromKodiOpenMedia(kodiOpenMedia: KodiOpenMedia) {
    if (kodiOpenMedia.movie) {
      return of(getSourceQueryMovie(kodiOpenMedia.movie));
    }

    const sourceQuery = getSourceQueryEpisode(kodiOpenMedia.show, kodiOpenMedia.episode);

    return this.getEpisodeAbsoluteNumberIfAnime(sourceQuery).pipe(
      map(absoluteNumber => {
        if (absoluteNumber) {
          sourceQuery.episode.absoluteNumber = absoluteNumber;
        }

        return sourceQuery;
      })
    );
  }
}
