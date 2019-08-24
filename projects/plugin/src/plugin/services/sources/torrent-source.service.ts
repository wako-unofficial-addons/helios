import { Injectable } from '@angular/core';
import { ProviderService } from '../provider.service';
import { SettingsService } from '../settings.service';
import { from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Episode, Movie, Show } from '@wako-app/mobile-sdk';
import { TorrentsMoviesFromProvidersQuery } from '../../queries/torrents/torrents-movies-from-providers.query';
import { TorrentsEpisodesFromProvidersQuery } from '../../queries/torrents/torrents-episodes-from-providers.query';
import { TorrentsSearchFromProvidersQuery } from '../../queries/torrents/torrents-search-from-providers.query';
import { TorrentSource } from '../../entities/torrent-source';
import { getScoreMatchingName, getSourcesByQuality, sortTorrentsBalanced } from '../tools';
import { Provider } from '../../entities/provider';
import { TorrentSourceWithStats } from '../../entities/torrent-source-with-stats';
import { SourceTorrentStats } from '../../entities/source-torrent-stats';
import { TorrentsFromProviderBaseQuery } from '../../queries/torrents/torrents-from-provider-base.query';

@Injectable()
export class TorrentSourceService {
  constructor(private providerService: ProviderService, private settingsService: SettingsService) {
  }


  getBestSource(torrents: TorrentSource[], previousPlayedSourceName?: string) {
    const torrentQuality = getSourcesByQuality<TorrentSource>(torrents, sortTorrentsBalanced);

    if (previousPlayedSourceName) {
      let maxScore = 0;
      let source;
      torrents.forEach(t => {
        const score = getScoreMatchingName(previousPlayedSourceName, t.title);
        if (score > maxScore) {
          source = t;
          maxScore = score;
        }
      });
      if (source) {
        return source;
      }
    }

    let bestTorrent: TorrentSource = null;

    if (this.hasBestTorrent(torrentQuality.sources2160p)) {
      bestTorrent = torrentQuality.sources2160p[0];
    } else if (this.hasBestTorrent(torrentQuality.sources1080p)) {
      bestTorrent = torrentQuality.sources1080p[0];
    } else if (this.hasBestTorrent(torrentQuality.sources720p)) {
      bestTorrent = torrentQuality.sources720p[0];
    } else if (this.hasBestTorrent(torrentQuality.sourcesOther)) {
      bestTorrent = torrentQuality.sourcesOther[0];
    }

    return bestTorrent;
  }

  private excludeUnwantedHighQuality(torrents: TorrentSource[]) {
    return from(this.settingsService.get()).pipe(
      map(settings => {
        const excludeQualities = [];
        let stop = false;
        settings.qualities.forEach(quality => {
          if (quality.enabled) {
            stop = true;
          }
          if (!stop && !quality.enabled) {
            excludeQualities.push(quality.quality);
          }
        });

        return torrents.filter(torrent => !excludeQualities.includes(torrent.quality));
      })
    );
  }

  getMovieTorrents(movie: Movie) {
    return from(this.providerService.getAll()).pipe(
      switchMap(providers => {
        return TorrentsMoviesFromProvidersQuery.getData(movie, providers)
          .pipe(
            switchMap(torrents => this.excludeUnwantedHighQuality(torrents)),
            map(torrents => this.getTorrentSourceWithStats(torrents, providers))
          )
      })
    );
  }

  getEpisodeTorrents(show: Show, episode: Episode) {
    return from(this.providerService.getAll()).pipe(
      switchMap(providers => {
        return TorrentsEpisodesFromProvidersQuery.getData(show, episode, providers)
          .pipe(
            switchMap(torrents => this.excludeUnwantedHighQuality(torrents)),
            map(torrents => this.getTorrentSourceWithStats(torrents, providers))
          )
      })
    );
  }

  getTorrents(query: string, category: 'movie' | 'tv' | 'anime') {
    return from(this.providerService.getAll()).pipe(
      switchMap(providers => {
        return TorrentsSearchFromProvidersQuery.getData(query, category, providers)
          .pipe(
            map(torrents => {
              return this.getTorrentSourceWithStats(torrents, providers)
            })
          )
      })
    );
  }

  private getTorrentSourceWithStats(torrents: TorrentSource[], providers: Provider[]) {

    const torrentSourceWithStats: TorrentSourceWithStats = {
      stats: this.getStats(torrents, providers),
      torrents: TorrentsFromProviderBaseQuery.excludeDuplicateTorrentsByHash(torrents)
    };

    return torrentSourceWithStats
  }

  private getStats(torrents: TorrentSource[], providers: Provider[]) {
    const stats: SourceTorrentStats[] = [];

    const mapByProviders = new Map<string, SourceTorrentStats>();

    torrents.forEach(torrent => {
      if (!mapByProviders.has(torrent.providerName)) {
        mapByProviders.set(torrent.providerName, {providerName: torrent.providerName, torrents: 0});
      }

      const data = mapByProviders.get(torrent.providerName);
      data.torrents++;

      mapByProviders.set(torrent.providerName, data);

    });

    providers.forEach(provider => {

      stats.push({
        providerName: provider.name,
        torrents: mapByProviders.has(provider.name) ? mapByProviders.get(provider.name).torrents : 0
      })
    });

    return stats;
  }

  private hasBestTorrent(torrents: TorrentSource[]) {
    if (torrents.length === 0) {
      return false;
    }
    const torrent = torrents[0];
    return torrent.seeds >= 20 && torrent.seeds > torrent.peers;
  }
}
