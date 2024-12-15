import { TorrentSource } from '../entities/torrent-source';
import { Settings } from '../entities/settings';
import { SourceQuality } from '../entities/source-quality';
import { StreamLinkSource } from '../entities/stream-link-source';
import { TorrentSourceDetail } from '../entities/torrent-source-detail';
import { StreamLinkSourceDetail } from '../entities/stream-link-source-detail';
import { SourceQuery } from '../entities/source-query';

export class SourcesFilterBySettingsQuery {
  private static setExcludedReasonByQualities<T extends TorrentSource | StreamLinkSource>({
    sources,
    excludeQualities,
  }: {
    sources: T[];
    excludeQualities: string[];
  }) {
    const allQualities: SourceQuality[] = ['2160p', '1080p', '720p', 'other'];

    sources.forEach((source) => {
      if (!allQualities.includes(source.quality)) {
        source.excludedReason = `Quality "${source.quality}" not supported`;
      } else if (excludeQualities.includes(source.quality)) {
        source.excludedReason = `Quality "${source.quality}" excluded by settings`;
      }
    });
    return sources;
  }

  private static setExcludedReasonBySizeFilter<T extends TorrentSource | StreamLinkSource>({
    sourceQuery,
    sources,
    settings,
  }: {
    sourceQuery: SourceQuery;
    sources: T[];
    settings: Settings;
  }) {
    const filter = sourceQuery.category === 'movie' ? settings.fileSizeFilteringMovie : settings.fileSizeFilteringTv;

    if (filter.enabled === false) {
      return;
    }

    const maxSizeByte = filter.maxSize > 0 ? filter.maxSize * 1024 * 1024 * 1024 : 0;
    const minSizeByte = filter.minSize > 0 ? filter.minSize * 1024 * 1024 * 1024 : 0;

    sources.forEach((source) => {
      if (source.size === null || source.size === 0 || source.isPackage) {
        source.excludedReason = 'Size not available';
        return;
      }

      let conditionValid = 0;

      if (minSizeByte === 0) {
        conditionValid++;
      }

      if (maxSizeByte === 0) {
        conditionValid++;
      }

      if (minSizeByte > 0 && source.size >= minSizeByte) {
        conditionValid++;
      }
      if (maxSizeByte > 0 && source.size <= maxSizeByte) {
        conditionValid++;
      }

      if (conditionValid < 2) {
        const size = Math.round(source.size / 1024 / 1024 / 1024);
        const minSize = Math.round(minSizeByte / 1024 / 1024 / 1024);
        const maxSize = Math.round(maxSizeByte / 1024 / 1024 / 1024);
        source.excludedReason = `Size ${size}GB not in range ${minSize} - ${maxSize}GB`;
      }
    });
  }

  static applySettingsFilters({
    sourceQuery,
    torrentSourceDetail,
    streamLinkSourceDetail,
    settings,
  }: {
    sourceQuery: SourceQuery;
    torrentSourceDetail?: TorrentSourceDetail;
    streamLinkSourceDetail?: StreamLinkSourceDetail;
    settings: Settings;
  }) {
    const excludeQualities: SourceQuality[] = [];
    settings.qualities.forEach((quality) => {
      if (!quality.enabled) {
        excludeQualities.push(quality.quality);
      }
    });

    // Filter by qualities
    if (torrentSourceDetail) {
      this.setExcludedReasonByQualities({
        sources: torrentSourceDetail.sources,
        excludeQualities,
      });
    }
    if (streamLinkSourceDetail) {
      this.setExcludedReasonByQualities({
        sources: streamLinkSourceDetail.sources,
        excludeQualities,
      });
    }

    // Filter by size
    if (torrentSourceDetail) {
      this.setExcludedReasonBySizeFilter({
        sourceQuery,
        sources: torrentSourceDetail.sources,
        settings,
      });
    }
    if (streamLinkSourceDetail) {
      this.setExcludedReasonBySizeFilter({
        sourceQuery,
        sources: streamLinkSourceDetail.sources,
        settings,
      });
    }

    if (torrentSourceDetail) {
      torrentSourceDetail.sources = torrentSourceDetail.sources.filter((source) => !source.excludedReason);

      TorrentSourceDetail.setExcludedSources(torrentSourceDetail);
    }

    if (streamLinkSourceDetail) {
      streamLinkSourceDetail.sources = streamLinkSourceDetail.sources.filter((source) => !source.excludedReason);
      StreamLinkSourceDetail.setExcludedSources(streamLinkSourceDetail);
    }
  }
}
