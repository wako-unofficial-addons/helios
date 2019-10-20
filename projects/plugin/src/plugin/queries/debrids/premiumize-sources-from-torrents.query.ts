import { of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { cleanTitle, getSupportedMedia, isEpisodeCodeMatchesFileName, logData } from '../../services/tools';
import { PremiumizeApiService } from '../../services/premiumize/services/premiumize-api.service';
import { PremiumizeCacheCheckForm } from '../../services/premiumize/forms/cache/premiumize-cache-check.form';
import { PremiumizeTransferDirectdlForm } from '../../services/premiumize/forms/transfer/premiumize-transfer-directdl.form';
import { PreimumizeTransferDirectdlContentDto } from '../../services/premiumize/dtos/transfer/premiumize-transfer-directdl.dto';
import { DebridSource, DebridSourceFile } from '../../entities/debrid-source';
import { TorrentSource } from '../../entities/torrent-source';
import { StreamLinkSource } from '../../entities/stream-link-source';

export class PremiumizeSourcesFromTorrentsQuery {
  private static hasPremiumize() {
    return PremiumizeApiService.hasApiKey();
  }

  private static getAllHash(torrents: TorrentSource[]) {
    const allHashes = [];
    torrents.forEach(torrent => {
      if (torrent.hash && !allHashes.includes(torrent.hash)) {
        allHashes.push(torrent.hash);
      }
    });
    return allHashes;
  }

  static getData(torrents: TorrentSource[]) {
    const streamLinkSources: StreamLinkSource[] = [];

    if (torrents.length === 0 || !this.hasPremiumize()) {
      return of(streamLinkSources);
    }

    const allHashes = this.getAllHash(torrents);

    return PremiumizeCacheCheckForm.submit(allHashes).pipe(
      map(data => {
        if (data.status === 'error') {
          return streamLinkSources;
        }
        allHashes.forEach((hash, index) => {
          torrents.forEach(torrent => {
            if (torrent.hash && torrent.hash === hash) {
              if (data.response[index]) {
                torrent.isOnPM = true;

                const debridSource = new StreamLinkSource(
                  'PM-' + torrent.hash,
                  torrent.title,
                  torrent.size,
                  torrent.quality,
                  'cached_torrent',
                  torrent.isPackage,
                  'PM',
                  torrent.provider
                );

                debridSource.premiumizeTransferDirectdlDto = PremiumizeTransferDirectdlForm.submit(torrent.url);


                streamLinkSources.push(debridSource);
              }
            }
          });
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
