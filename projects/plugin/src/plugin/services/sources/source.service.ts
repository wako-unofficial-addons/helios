import { Injectable } from '@angular/core';
import { Episode, Movie, Show } from '@wako-app/mobile-sdk';
import { map, switchMap } from 'rxjs/operators';
import { TorrentsMoviesFromProvidersQuery } from '../../queries/torrents/torrents-movies-from-providers.query';
import { TorrentsEpisodesFromProvidersQuery } from '../../queries/torrents/torrents-episodes-from-providers.query';
import { SourceDetail } from '../../entities/source-detail';
import { DebridSourceService } from './debrid-source.service';
import { TorrentSourceService } from './torrent-source.service';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { HeliosCacheService } from '../provider-cache.service';
import { getPreviousFileNamePlayed } from '../tools';
import { TorrentSourceWithStats } from '../../entities/torrent-source-with-stats';
import { TorrentsFilterOnWantedQualityQuery } from '../../queries/torrents/torrents-filter-on-wanted-quality.query';
import { from } from 'rxjs';
import { SettingsService } from '../settings.service';

@Injectable()
export class SourceService {
  constructor(
    private debridSourceService: DebridSourceService,
    private torrentSourceService: TorrentSourceService,
    private settingsService: SettingsService
  ) {}

  private getSourceDetail(
    torrentsWithStats: TorrentSourceWithStats,
    sourceQuery: SourceQuery | SourceEpisodeQuery | string,
    previousPlayedSourceName?: string,
    skipUnWantedQualityDebrid = true
  ) {
    const torrents = torrentsWithStats.torrents;

    const sourceDetail = {} as SourceDetail;
    sourceDetail.stats = torrentsWithStats.stats;

    return from(this.settingsService.get()).pipe(
      switchMap(settings => {
        const filteredTorrents = skipUnWantedQualityDebrid
          ? TorrentsFilterOnWantedQualityQuery.getData(torrents, settings.qualities)
          : torrents;
        sourceDetail.torrentSources = filteredTorrents;
        sourceDetail.bestTorrent = this.torrentSourceService.getBestSource(filteredTorrents, previousPlayedSourceName);

        return this.debridSourceService.getFromTorrents(filteredTorrents, sourceQuery).pipe(
          switchMap(debridSources => {
            sourceDetail.debridSources = debridSources;
            return this.debridSourceService.getBestSource(debridSources, previousPlayedSourceName);
          }),
          map(bestDebridSource => {
            sourceDetail.bestDebrid = bestDebridSource;
            return sourceDetail;
          })
        );
      })
    );
  }

  getMovie(movie: Movie) {
    const sourceQuery = TorrentsMoviesFromProvidersQuery.getSourceQuery(movie);

    return this.torrentSourceService.getMovieTorrents(movie).pipe(
      switchMap(torrentsWithStats => {
        return this.getSourceDetail(torrentsWithStats, sourceQuery);
      })
    );
  }

  getEpisode(show: Show, episode: Episode) {
    const sourceQuery = TorrentsEpisodesFromProvidersQuery.getSourceQuery(show, episode);

    return this.torrentSourceService.getEpisodeTorrents(show, episode).pipe(
      switchMap(torrentsWithStats => {
        return HeliosCacheService.get<string>(getPreviousFileNamePlayed(show.traktId)).pipe(
          switchMap(previousFileNamePlayed => {
            return this.getSourceDetail(torrentsWithStats, sourceQuery, previousFileNamePlayed);
          })
        );
      })
    );
  }

  get(sourceQuery: string, category: 'movie' | 'tv' | 'anime') {
    return this.torrentSourceService.getTorrents(sourceQuery, category).pipe(
      switchMap(torrentsWithStats => {
        return this.getSourceDetail(torrentsWithStats, sourceQuery, null, false);
      })
    );
  }
}
