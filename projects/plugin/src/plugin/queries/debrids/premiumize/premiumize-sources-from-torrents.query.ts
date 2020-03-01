import { forkJoin, of } from 'rxjs';
import { catchError, map, mapTo } from 'rxjs/operators';
import { logData } from '../../../services/tools';
import { PremiumizeApiService } from '../../../services/premiumize/services/premiumize-api.service';
import { PremiumizeTransferDirectdlForm } from '../../../services/premiumize/forms/transfer/premiumize-transfer-directdl.form';
import { TorrentSource } from '../../../entities/torrent-source';
import { StreamLinkSource } from '../../../entities/stream-link-source';
import { PremiumizeCacheCheckForm } from '../../../services/premiumize/forms/cache/premiumize-cache-check.form';

export class PremiumizeSourcesFromTorrentsQuery {
  private static hasPremiumize() {
    return PremiumizeApiService.hasApiKey();
  }

  private static getAllHash(torrents: TorrentSource[]) {
    const allHashes = [];
    torrents.forEach(torrent => {
      let hash = torrent.hash;
      const shortMagnet = this.getShortMagnet(torrent.url);
      if (shortMagnet) {
        hash = shortMagnet;
      }
      if (hash && !allHashes.includes(hash)) {
        allHashes.push(hash);
      }
    });
    return allHashes;
  }

  private static getShortMagnet(url: string) {
    if (url && url.match('magnet')) {
      const splits = url.split('&');
      return splits.shift();
    }
    return null;
  }

  private static cacheCheck(hash: string[]) {
    const isCachedMap = new Map<string, boolean>();

    const allGroups = [];
    let hashGroup = [];
    hash.forEach(h => {
      hashGroup.push(h);

      if (hashGroup.join('').length > 3000) {
        allGroups.push(hashGroup);
        hashGroup = [];
      }
    });

    if (hashGroup.length > 0) {
      allGroups.push(hashGroup);
    }

    const obss = [];

    allGroups.forEach(hashes => {

      obss.push(
        PremiumizeCacheCheckForm.submit(hashes).pipe(
          map(data => {
            if (data.status === 'success') {
              hashes.forEach((h, index) => {
                if (data.response[index]) {
                  isCachedMap.set(h, true);
                }
              });
            }
            return data;
          })
        )
      );
    });

    if (obss.length === 0) {
      return of(isCachedMap);
    }

    return forkJoin(...obss).pipe(mapTo(isCachedMap));
  }

  static getData(torrents: TorrentSource[]) {
    const streamLinkSources: StreamLinkSource[] = [];

    if (torrents.length === 0 || !this.hasPremiumize()) {
      return of(streamLinkSources);
    }

    const allHashes = this.getAllHash(torrents);

    return this.cacheCheck(allHashes).pipe(
      map(isCachedMap => {
        torrents.forEach(torrent => {
          let hash = torrent.hash;
          const shortMagnet = this.getShortMagnet(torrent.url);
          if (shortMagnet) {
            hash = shortMagnet;
          }

          if (isCachedMap.has(hash)) {
            torrent.isCached = true;
            torrent.cachedService = 'PM';

            const debridSource = new StreamLinkSource(
              'PM-' + torrent.hash,
              torrent.title,
              torrent.size,
              torrent.quality,
              'cached_torrent',
              torrent.isPackage,
              'PM',
              torrent.provider,
              torrent.url
            );

            debridSource.premiumizeTransferDirectdlDto = PremiumizeTransferDirectdlForm.submit(torrent.url);

            streamLinkSources.push(debridSource);
          }
        });

        return streamLinkSources;
      }),
      catchError(err => {
        logData(err);

        return of(streamLinkSources);
      })
    );
  }
}
