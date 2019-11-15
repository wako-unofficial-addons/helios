import { PreimumizeTransferDirectdlContentDto } from '../../services/premiumize/dtos/transfer/premiumize-transfer-directdl.dto';
import { SourceQuery } from '../../entities/source-query';
import { cleanTitle, getSupportedMedia, incrementEpisodeCode, isEpisodeCodeMatchesFileName } from '../../services/tools';
import { of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { StreamLink, StreamLinkSource } from '../../entities/stream-link-source';

export class PremiumizeGetStreamLinkQuery {
  static sortByNameAsc(files: PreimumizeTransferDirectdlContentDto[]) {
    files.sort((stream1, stream2) => {
      if (stream1.path === stream2.path) {
        return 0;
      }

      return stream1.path > stream2.path ? 1 : -1;
    });
  }

  static sortBySizeDesc(files: PreimumizeTransferDirectdlContentDto[]) {
    files.sort((stream1, stream2) => {
      if (+stream1.size === +stream2.size) {
        return 0;
      }

      return +stream1.size > +stream2.size ? -1 : 1;
    });
  }

  static getData(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery) {
    return streamLinkSource.premiumizeTransferDirectdlDto.pipe(
      switchMap(dto => {
        if (dto.status !== 'success') {
          return throwError(dto.message);
        }

        const files: PreimumizeTransferDirectdlContentDto[] = [];

        let hasIncompatibleFile = false;
        dto.content.forEach(_file => {
          const ext = '.' + _file.link.split('.').pop().toLowerCase();
          const commonVideoExtensions = getSupportedMedia('video').split('|');

          if (commonVideoExtensions.includes(ext)) {
            files.push(_file);
          } else {
            hasIncompatibleFile = true;
          }
        });

        if (files.length === 0 && hasIncompatibleFile) {
          return throwError(`The file ${dto.content[0].link} is not a video format`);
        }

        this.sortByNameAsc(files);

        if (sourceQuery.episode) {
          const streamLinks: StreamLink[] = []; // Current episode + next
          let currentEpisodeFound = false;

          let episodeCode = sourceQuery.episode.episodeCode;
          let error = false;

          const title = sourceQuery.episode.title + ' ' + sourceQuery.episode.episodeTitle;

          const hasSampleInTitle = title.match('sample') !== null;

          files.forEach(d => {
            if (error) {
              return;
            }
            const filename = d.path;
            if (isEpisodeCodeMatchesFileName(episodeCode, filename)) {

              if (!hasSampleInTitle && filename.match('sample') !== null) {
                return;
              }


              currentEpisodeFound = true;
              try {
                episodeCode = incrementEpisodeCode(episodeCode);
              } catch (e) {
                error = true;
              }

              const streamLink = new StreamLink(streamLinkSource.title, d.link, d.path, !!d.stream_link, d.stream_link);

              streamLinks.push(streamLink);
            }
          });

          if (currentEpisodeFound) {
            return of(streamLinks);
          }
        }

        if (sourceQuery.movie) {
          let file: PreimumizeTransferDirectdlContentDto = null;

          this.sortBySizeDesc(files);

          const filterTitle = cleanTitle(sourceQuery.movie.title);

          const year = sourceQuery.movie.year;
          files.forEach(_file => {
            const names = _file.path.split('/');
            if (names.length > 1) {
              names.shift();
            }

            const title = cleanTitle(names.join('/'));

            if (!file && title.indexOf(filterTitle) !== -1 && ((year && title.indexOf(year.toString()) !== -1) || !year)) {
              file = _file;
            }
          });

          if (!file && files.length === 1) {
            file = files[0];
          }

          if (!file) {
            files.forEach(__file => {
              const _title = cleanTitle(__file.path);

              if (!file && _title.indexOf('sample') !== -1 && _title.indexOf(filterTitle) !== -1) {
                file = __file;
              }
            });
          }

          if (file) {
            const streamLink = new StreamLink(streamLinkSource.title, file.link, file.path, !!file.stream_link, file.stream_link);

            return of([streamLink]);
          }
        }

        const streamLinks: StreamLink[] = [];

        files.forEach(_file => {
          const names = _file.path.split('/');
          if (names.length > 1) {
            names.shift();
          }

          const title = names.join('/');

          const streamLink = new StreamLink(title, _file.link, title, !!_file.stream_link, _file.stream_link);

          streamLinks.push(streamLink);
        });

        return of(streamLinks);
      })
    );
  }
}
