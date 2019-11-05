import { SourceQuery } from '../../entities/source-query';
import { incrementEpisodeCode, isEpisodeCodeMatchesFileName } from '../../services/tools';
import { RealDebridUnrestrictLinkDto } from '../../services/real-debrid/dtos/unrestrict/real-debrid-unrestrict-link.dto';
import { StreamLink, StreamLinkSource } from '../../entities/stream-link-source';
import { map } from 'rxjs/operators';

export class RealDebridGetStreamLinkQuery {
  static sortByNameAsc(files: RealDebridUnrestrictLinkDto[]) {
    files.sort((stream1, stream2) => {
      if (stream1.filename === stream2.filename) {
        return 0;
      }

      return stream1.filename > stream2.filename ? 1 : -1;
    });
  }

  static sortBySizeDesc(files: RealDebridUnrestrictLinkDto[]) {
    files.sort((stream1, stream2) => {
      if (+stream1.filesize === +stream2.filesize) {
        return 0;
      }

      return +stream1.filesize > +stream2.filesize ? -1 : 1;
    });
  }

  static getData(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery) {
    return streamLinkSource.realDebridLinks.pipe(
      map(links => {
        if (sourceQuery.episode) {
          this.sortByNameAsc(links);

          const streamLinks: StreamLink[] = []; // Current episode + next
          let currentEpisodeFound = false;

          let episodeCode = sourceQuery.episode.episodeCode;
          let error = false;

          links.forEach(link => {
            if (error) {
              return;
            }

            if (isEpisodeCodeMatchesFileName(episodeCode, link.filename)) {
              currentEpisodeFound = true;
              try {
                episodeCode = incrementEpisodeCode(episodeCode);
              } catch (e) {
                error = true;
              }

              const streamLink = new StreamLink(
                streamLinkSource.title,
                link.download,
                link.filename,
                !!link.streamable,
                null,
                `https://real-debrid.com/streaming-${link.id}`
              );

              streamLinks.push(streamLink);
            }
          });

          if (currentEpisodeFound) {
            return streamLinks;
          }
        }

        let streamLink: StreamLink = null;

        if (sourceQuery.movie) {
          this.sortBySizeDesc(links);

          let foundLink = links.shift();

          if (foundLink) {
            streamLink = new StreamLink(
              streamLinkSource.title,
              foundLink.download,
              foundLink.filename,
              !!foundLink.streamable,
              null,
              `https://real-debrid.com/streaming-${foundLink.id}`
            );
            return [streamLink];
          }
        }

        const streamLinks: StreamLink[] = [];

        links.forEach(link => {
          const streamLink = new StreamLink(
            streamLinkSource.title,
            link.download,
            link.filename,
            !!link.streamable,
            null,
            `https://real-debrid.com/streaming-${link.id}`
          );
          streamLinks.push(streamLink);
        });

        return streamLinks;
      })
    );
  }
}
