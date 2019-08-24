import { of } from 'rxjs';
import { RealDebridTorrentsInstantAvailabilityForm } from '../../services/real-debrid/forms/torrents/real-debrid-torrents-instant-availability.form';
import { catchError, map } from 'rxjs/operators';
import { RealDebridGetCachedUrlQuery } from '../../services/real-debrid/queries/real-debrid-get-cached-url.query';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { isEpisodeCodeMatchesFileName } from '../../services/tools';
import { RealDebridApiService } from '../../services/real-debrid/services/real-debrid-api.service';
import { TorrentSource } from '../../entities/torrent-source';
import { DebridSource, DebridSourceFile } from '../../entities/debrid-source';

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

  static getData(torrents: TorrentSource[], sourceQuery: SourceQuery | SourceEpisodeQuery | string) {
    const debridSources: DebridSource[] = [];

    if (torrents.length === 0 || !this.hasRealDebrid()) {
      return of(debridSources);
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

          if (sourceQuery instanceof SourceEpisodeQuery) {
            const groupWithFile = [];

            data.rd.forEach((rd, index) => {
              Object.keys(rd).forEach(key => {
                const file = rd[key];

                if (file.filename.match(/.mkv|.mp4/) && isEpisodeCodeMatchesFileName(sourceQuery.episodeCode, file.filename)) {
                  groupWithFile.push(index);
                }
              });
            });

            if (groupWithFile.length === 0) {
              return torrent;
            }
            groupIndex = groupWithFile.shift();
          }


          torrent.isOnRD = true;

          const debridSource = new DebridSource(
            'RD-' + torrent.hash,
            torrent.title,
            torrent.size,
            torrent.quality,
            true,
            torrent.hash,
            torrent.isPackage,
            'RD',
            torrent.providerName
          );

          debridSource.fromTorrent = true;

          const fileIds = Object.getOwnPropertyNames(data.rd[groupIndex]);

          debridSource.debridSourceFileObs = RealDebridGetCachedUrlQuery.getData(
            torrent.url,
            fileIds.join(','),
            torrent.isPackage
          ).pipe(
            map(links => {
              let debridSourceFile: DebridSourceFile = null;

              if (sourceQuery instanceof SourceEpisodeQuery) {
                links.forEach(link => {
                  if (!debridSourceFile && isEpisodeCodeMatchesFileName(sourceQuery.episodeCode, link.filename)) {
                    debridSourceFile = new DebridSourceFile(
                      torrent.title,
                      link.download,
                      link.filename,
                      !!link.streamable,
                      !!link.streamable ? link.download : null
                    );
                  }
                });
              } else if (sourceQuery instanceof SourceQuery) {
                const link = links.shift();

                debridSourceFile = new DebridSourceFile(
                  torrent.title,
                  link.download,
                  link.filename,
                  !!link.streamable,
                  !!link.streamable ? link.download : null
                );
              }

              if (debridSourceFile) {

                return debridSourceFile;
              }

              const debridSourceFiles: DebridSourceFile[] = [];

              links.forEach(link => {
                const debridSourceFile = new DebridSourceFile(
                  torrent.title,
                  link.download,
                  link.filename,
                  !!link.streamable,
                  !!link.streamable ? link.download : null
                );
                debridSourceFiles.push(debridSourceFile);
              });

              return debridSourceFiles.length === 1 ? debridSourceFiles.pop() : debridSourceFiles;
            })
          );

          debridSources.push(debridSource);

        });

        return debridSources;
      }),
      catchError(err => {
        console.log('RD err', err);
        return of(debridSources);
      })
    );
  }
}
