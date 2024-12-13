import { Injectable } from '@angular/core';
import { SettingsService } from '../settings.service';
import { from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TorrentSource } from '../../entities/torrent-source';
import { getScoreMatchingName, getSourcesByQuality, sortTorrentsBalanced } from '../tools';
import { Provider } from '../../entities/provider';
import { SourceQuery } from '../../entities/source-query';
import { TorrentsFromProviderQuery } from '../../queries/torrents/torrents-from-provider.query';
import { LastPlayedSource } from '../../entities/last-played-source';
import { SourcesFilterOnWantedQualityQuery } from '../../queries/sources-filter-on-wanted-quality.query';
import { Settings } from '../../entities/settings';

@Injectable()
export class TorrentSourceService {
  constructor(private settingsService: SettingsService) {}

  getBestSource(torrents: TorrentSource[], lastPlayedSource?: LastPlayedSource) {
    const torrentQuality = getSourcesByQuality<TorrentSource>(torrents, sortTorrentsBalanced);

    if (lastPlayedSource) {
      let maxScore = 0;
      let source: TorrentSource;
      torrents.forEach((t) => {
        const score = getScoreMatchingName(lastPlayedSource.title, t.title);
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

  private setExcludedReasonBySizeFilter({
    sourceQuery,
    torrents,
    settings,
  }: {
    sourceQuery: SourceQuery;
    torrents: TorrentSource[];
    settings: Settings;
  }) {
    const filter = sourceQuery.category === 'movie' ? settings.fileSizeFilteringMovie : settings.fileSizeFilteringTv;

    if (filter.enabled === false) {
      return torrents;
    }

    const maxSizeByte = filter.maxSize > 0 ? filter.maxSize * 1024 * 1024 * 1024 : 0;
    const minSizeByte = filter.minSize > 0 ? filter.minSize * 1024 * 1024 * 1024 : 0;

    return torrents.map((torrent) => {
      if (torrent.size === null || torrent.size === 0 || torrent.isPackage) {
        torrent.excludedReason = 'Size not available';
        return torrent;
      }

      let conditionValid = 0;

      if (minSizeByte === 0) {
        conditionValid++;
      }

      if (maxSizeByte === 0) {
        conditionValid++;
      }

      if (minSizeByte > 0 && torrent.size >= minSizeByte) {
        conditionValid++;
      }
      if (maxSizeByte > 0 && torrent.size <= maxSizeByte) {
        conditionValid++;
      }

      if (conditionValid < 2) {
        torrent.excludedReason = `Size ${torrent.size} not in range ${minSizeByte} - ${maxSizeByte}`;
      }
      return torrent;
    });
  }

  getByProvider(sourceQuery: SourceQuery, provider: Provider) {
    return TorrentsFromProviderQuery.getData(sourceQuery, provider).pipe(
      catchError((err) => {
        return throwError(err);
      }),
      switchMap((torrentSourceDetail) => {
        return from(this.settingsService.get()).pipe(
          map((settings) => {
            SourcesFilterOnWantedQualityQuery.setExcludedReasonForHighestUnwantedQuality({
              sources: torrentSourceDetail.sources,
              qualities: settings.qualities,
            });

            this.setExcludedReasonBySizeFilter({ sourceQuery, torrents: torrentSourceDetail.sources, settings });

            torrentSourceDetail.sources = torrentSourceDetail.sources.filter((torrent) => !torrent.excludedReason);
            return torrentSourceDetail;
          }),
        );
      }),
    );
  }

  private hasBestTorrent(torrents: TorrentSource[]) {
    if (torrents.length === 0) {
      return false;
    }
    const torrent = torrents[0];
    return torrent.seeds >= 20 && torrent.seeds > torrent.peers;
  }
}
