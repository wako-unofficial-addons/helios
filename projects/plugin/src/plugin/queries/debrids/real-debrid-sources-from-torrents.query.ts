import { of } from 'rxjs';
import { RealDebridTorrentsInstantAvailabilityForm } from '../../services/real-debrid/forms/torrents/real-debrid-torrents-instant-availability.form';
import { catchError, map } from 'rxjs/operators';
import { RealDebridGetCachedUrlQuery } from '../../services/real-debrid/queries/real-debrid-get-cached-url.query';
import { SourceQuery } from '../../entities/source-query';
import { isEpisodeCodeMatchesFileName } from '../../services/tools';
import { RealDebridApiService } from '../../services/real-debrid/services/real-debrid-api.service';
import { TorrentSource } from '../../entities/torrent-source';
import { StreamLinkSource } from '../../entities/stream-link-source';

export class RealDebridSourcesFromTorrentsQuery {
  private static hasRealDebrid() {
    return !!RealDebridApiService.getToken();
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

  static getData(torrents: TorrentSource[], sourceQuery: SourceQuery) {
    const streamLinkSources: StreamLinkSource[] = [];

    if (torrents.length === 0 || !this.hasRealDebrid()) {
      return of(streamLinkSources);
    }
    const allHashes = this.getAllHash(torrents);

    return RealDebridTorrentsInstantAvailabilityForm.submit(allHashes).pipe(
      map(realDebridTorrentsInstantAvailabilityDto => {

        torrents.forEach(torrent => {
          if (!torrent.hash) {
            return;
          }
          const data = realDebridTorrentsInstantAvailabilityDto[torrent.hash.toLowerCase()];
          if (!data || !data.rd || data.rd.length === 0) {
            return;
          }

          // Take the group with the most video files
          let groupIndex = 0;


          if (sourceQuery.episode) {
            const groupWithFile = [];


            let firstVideoFileIndex = null;

            const episodeCode = sourceQuery.episode.episodeCode;

            data.rd.forEach((rd, index) => {
              Object.keys(rd).forEach(key => {
                const file = rd[key];

                if (!firstVideoFileIndex && file.filename.match(/.mkv|.mp4/)) {
                  firstVideoFileIndex = index;
                }

                if (file.filename.match(/.mkv|.mp4/) && isEpisodeCodeMatchesFileName(episodeCode, file.filename)) {
                  groupWithFile.push(index);
                }
              });
            });

            if (groupWithFile.length > 0) {
              groupIndex = groupWithFile.shift();
            } else if (firstVideoFileIndex !== null) {
              groupIndex = firstVideoFileIndex;
            }
          }


          torrent.isOnRD = true;

          const debridSource = new StreamLinkSource(
            'RD-' + torrent.hash,
            torrent.title,
            torrent.size,
            torrent.quality,
            'cached_torrent',
            torrent.isPackage,
            'RD',
            torrent.provider,
            torrent.url
          );


          const fileIds = Object.getOwnPropertyNames(data.rd[groupIndex]);

          debridSource.realDebridLinks = RealDebridGetCachedUrlQuery.getData(
            torrent.url,
            fileIds.join(','),
            torrent.isPackage
          );

          streamLinkSources.push(debridSource);

        });

        return streamLinkSources;
      }),
      catchError(err => {
        console.log('RD err', err);
        return of(streamLinkSources);
      })
    );
  }
}
