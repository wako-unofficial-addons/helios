import { forkJoin, of } from 'rxjs';
import { catchError, map, mapTo } from 'rxjs/operators';
import { getHashFromUrl, logData } from '../../../services/tools';
import { TorboxApiService } from '../../../services/torbox/services/torbox-api.service';
import { TorrentSource } from '../../../entities/torrent-source';
import { StreamLinkSource } from '../../../entities/stream-link-source';
import { TorboxCacheCheckForm } from '../../../services/torbox/forms/cache/torbox-cache-check.form';
import { TorboxGetLinksQuery } from './torbox-get-links.query';

export class TorboxSourcesFromTorrentsQuery {
  private static hasTorbox() {
    return TorboxApiService.hasApiKey();
  }

  private static setHash(torrent: TorrentSource) {
    let hash = torrent.hash;
    if (!hash) {
      hash = getHashFromUrl(torrent.url);
    }
    if (hash && !torrent.hash) {
      torrent.hash = hash;
    }
  }

  private static getAllHash(torrents: TorrentSource[]) {
    const allHashes = [];
    torrents.forEach((torrent) => {
      this.setHash(torrent);

      if (torrent.hash && !allHashes.includes(torrent.hash)) {
        allHashes.push(torrent.hash);
      }
    });
    return allHashes;
  }

  private static cacheCheck(hash: string[]) {
    const isCachedMap = new Map<string, boolean>();

    const allGroups = [];
    let hashGroup = [];
    hash.forEach((h) => {
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

    allGroups.forEach((hashes) => {
      obss.push(
        TorboxCacheCheckForm.submit(hashes).pipe(
          map((dto) => {
            if (dto.success && dto.data) {
              Object.keys(dto.data).forEach((hash) => {
                isCachedMap.set(hash, true);
              });
            }
            return dto;
          }),
        ),
      );
    });

    if (obss.length === 0) {
      return of(isCachedMap);
    }

    return forkJoin(...obss).pipe(mapTo(isCachedMap));
  }

  static getData(torrents: TorrentSource[]) {
    const streamLinkSources: StreamLinkSource[] = [];

    if (torrents.length === 0 || !this.hasTorbox()) {
      return of(streamLinkSources);
    }

    const allHashes = this.getAllHash(torrents);

    return this.cacheCheck(allHashes).pipe(
      map((isCachedMap) => {
        torrents.forEach((torrent) => {
          this.setHash(torrent);

          if (isCachedMap.has(torrent.hash)) {
            torrent.isCached = true;
            torrent.cachedService = 'TB';

            const debridSource = new StreamLinkSource(
              'TB-' + torrent.hash,
              torrent.title,
              torrent.size,
              torrent.quality,
              'cached_torrent',
              torrent.isPackage,
              'TB',
              torrent.provider,
              torrent.url,
              torrent.hash,
            );

            debridSource.torboxTransferFiles = TorboxGetLinksQuery.getData(torrent.url, torrent.isPackage);

            streamLinkSources.push(debridSource);
          }
        });

        return streamLinkSources;
      }),
      catchError((err) => {
        logData(err);
        return of(streamLinkSources);
      }),
    );
  }
}
