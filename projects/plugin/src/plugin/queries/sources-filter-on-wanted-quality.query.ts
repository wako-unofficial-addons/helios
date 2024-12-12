import { TorrentSource } from '../entities/torrent-source';
import { SettingsQuality } from '../entities/settings';
import { SourceQuality } from '../entities/source-quality';
import { StreamLinkSource } from '../entities/stream-link-source';

export class SourcesFilterOnWantedQualityQuery {
  private static filterByExcludedQualities<T extends TorrentSource | StreamLinkSource>(
    sources: T[],
    excludeQualities: string[],
  ) {
    const allQualities: SourceQuality[] = ['2160p', '1080p', '720p', 'other'];
    return sources.filter((source) => {
      return allQualities.includes(source.quality) && excludeQualities.includes(source.quality) === false;
    });
  }

  private static getOnlyNeededQuality<T extends TorrentSource | StreamLinkSource>(
    sources: T[],
    excludeQualities: string[],
  ): T[] {
    let filteredSources = [];
    const _excludeQualities = excludeQualities.slice(0);

    _excludeQualities.unshift('fake'); // this will be removed first;

    do {
      _excludeQualities.shift();
      filteredSources = this.filterByExcludedQualities(sources, _excludeQualities);
    } while (filteredSources.length < 20 && _excludeQualities.length > 0);

    return filteredSources;
  }

  static getData<T extends TorrentSource | StreamLinkSource>(sources: T[], qualities: SettingsQuality[]) {
    const excludeQualities: SourceQuality[] = [];

    qualities.forEach((quality) => {
      if (quality.enabled === false) {
        excludeQualities.push(quality.quality);
      }
    });
    return this.getOnlyNeededQuality<T>(sources.slice(0), excludeQualities);
  }
}
