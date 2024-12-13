import { TorrentSource } from '../entities/torrent-source';
import { SettingsQuality } from '../entities/settings';
import { SourceQuality } from '../entities/source-quality';
import { StreamLinkSource } from '../entities/stream-link-source';

export class SourcesFilterOnWantedQualityQuery {
  private static setExcludedReasonByQualities<T extends TorrentSource | StreamLinkSource>(
    sources: T[],
    excludeQualities: string[],
  ) {
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

  private static getOnlyNeededQuality<T extends TorrentSource | StreamLinkSource>(
    sources: T[],
    excludeQualities: string[],
  ) {
    let filteredSources: T[] = [];
    const _excludeQualities = excludeQualities.slice(0);

    _excludeQualities.unshift('fake'); // this will be removed first;

    do {
      _excludeQualities.shift();
      filteredSources = this.setExcludedReasonByQualities(sources, _excludeQualities).filter(
        (source) => !source.excludedReason,
      );
    } while (filteredSources.length < 20 && _excludeQualities.length > 0);

    return {
      filteredSources,
      allSources: sources,
    };
  }

  static getData<T extends TorrentSource | StreamLinkSource>({
    sources,
    qualities,
  }: {
    sources: T[];
    qualities: SettingsQuality[];
  }) {
    const excludeQualities: SourceQuality[] = [];

    qualities.forEach((quality) => {
      if (quality.enabled === false) {
        excludeQualities.push(quality.quality);
      }
    });

    return this.getOnlyNeededQuality<T>(sources.slice(0), excludeQualities);
  }

  static setExcludedReasonForHighestUnwantedQuality<T extends TorrentSource | StreamLinkSource>({
    sources,
    qualities,
  }: {
    sources: T[];
    qualities: SettingsQuality[];
  }) {
    const excludeQualities = [];
    let stop = false;
    qualities.forEach((quality) => {
      if (quality.enabled) {
        stop = true;
      }
      if (!stop && !quality.enabled) {
        excludeQualities.push(quality.quality);
      }
    });

    sources.forEach((source) => {
      if (excludeQualities.includes(source.quality)) {
        source.excludedReason = `Quality "${source.quality}" not enabled`;
      }
    });
  }
}
