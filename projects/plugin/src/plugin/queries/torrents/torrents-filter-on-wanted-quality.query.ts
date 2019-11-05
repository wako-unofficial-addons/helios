import { TorrentSource } from '../../entities/torrent-source';
import { SettingsQuality } from '../../entities/settings';
import { SourceQuality } from '../../entities/source-quality';

export class TorrentsFilterOnWantedQualityQuery {
  private static filterByExcludedQualities(torrents: TorrentSource[], excludeQualities: string[]) {
    const allQualities: SourceQuality[] = ['2160p', '1080p', '720p', 'other'];
    return torrents.filter(torrent => {
      return allQualities.includes(torrent.quality) && excludeQualities.includes(torrent.quality) === false;
    });
  }

  private static getOnlyNeededQuality(torrents: TorrentSource[], excludeQualities: string[]): TorrentSource[] {
    let filteredTorrents = [];
    const _excludeQualities = excludeQualities.slice(0);

    _excludeQualities.unshift('fake'); // this will be removed first;

    do {
      _excludeQualities.shift();
      filteredTorrents = this.filterByExcludedQualities(torrents, _excludeQualities);
    } while (filteredTorrents.length < 20 && _excludeQualities.length > 0);

    return filteredTorrents;
  }

  static getData(torrents: TorrentSource[], qualities: SettingsQuality[]) {
    const excludeQualities: SourceQuality[] = [];

    qualities.forEach(quality => {
      if (quality.enabled === false) {
        excludeQualities.push(quality.quality);
      }
    });
    return this.getOnlyNeededQuality(torrents.slice(0), excludeQualities);
  }
}
