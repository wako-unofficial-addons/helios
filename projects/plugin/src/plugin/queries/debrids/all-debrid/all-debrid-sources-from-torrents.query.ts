import { forkJoin, of } from 'rxjs';
import { catchError, map, mapTo } from 'rxjs/operators';
import { logData } from '../../../services/tools';
import { TorrentSource } from '../../../entities/torrent-source';
import { StreamLinkSource } from '../../../entities/stream-link-source';
import { AllDebridApiService } from '../../../services/all-debrid/services/all-debrid-api.service';
import { AllDebridMagnetInstantForm } from '../../../services/all-debrid/forms/magnet/all-debrid-magnet-instant.form';
import { AllDebridGetLinksQuery } from './all-debrid-get-links.query';

export class AllDebridSourcesFromTorrentsQuery {
  private static hasService() {
    return AllDebridApiService.hasApiKey();
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
        AllDebridMagnetInstantForm.submit(hashes).pipe(
          map(dto => {
            if (dto.status === 'success') {
              hashes.forEach((h, index) => {
                const response = dto.data.magnets[index];
                if (response && response.instant) {
                  isCachedMap.set(h, true);
                }
              });
            }
            return dto;
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

    if (torrents.length === 0 || !this.hasService()) {
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
            torrent.cachedService = 'AD';

            const debridSource = new StreamLinkSource(
              'AD-' + torrent.hash,
              torrent.title,
              torrent.size,
              torrent.quality,
              'cached_torrent',
              torrent.isPackage,
              'AD',
              torrent.provider,
              torrent.url
            );

            debridSource.allDebridMagnetStatusMagnet = AllDebridGetLinksQuery.getData(torrent.url, torrent.isPackage);

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
