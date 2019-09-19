import { of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { cleanTitle, getSupportedMedia, isEpisodeCodeMatchesFileName, logData } from '../../services/tools';
import { PremiumizeApiService } from '../../services/premiumize/services/premiumize-api.service';
import { PremiumizeCacheCheckForm } from '../../services/premiumize/forms/cache/premiumize-cache-check.form';
import { PremiumizeTransferDirectdlForm } from '../../services/premiumize/forms/transfer/premiumize-transfer-directdl.form';
import { PreimumizeTransferDirectdlContentDto } from '../../services/premiumize/dtos/transfer/preimumize-transfer-directdl.dto';
import { DebridSource, DebridSourceFile } from '../../entities/debrid-source';
import { TorrentSource } from '../../entities/torrent-source';

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

  static getData(torrents: TorrentSource[], sourceQuery: SourceQuery | SourceEpisodeQuery | string) {
    const debridSources: DebridSource[] = [];

    if (torrents.length === 0 || !this.hasPremiumize()) {
      return of(debridSources);
    }

    const allHashes = this.getAllHash(torrents);

    return PremiumizeCacheCheckForm.submit(allHashes).pipe(
      map(data => {
        if (data.status === 'error') {
          return debridSources;
        }
        allHashes.forEach((hash, index) => {
          torrents.forEach(torrent => {
            if (torrent.hash && torrent.hash === hash) {
              if (data.response[index]) {
                torrent.isOnPM = true;

                const debridSource = new DebridSource(
                  'PM-' + torrent.hash,
                  torrent.title,
                  torrent.size,
                  torrent.quality,
                  true,
                  torrent.hash,
                  torrent.isPackage,
                  'PM',
                  torrent.providerName
                );


                debridSource.debridSourceFileObs = PremiumizeTransferDirectdlForm.submit(torrent.url).pipe(
                  switchMap(_data => {
                    if (_data.status !== 'success') {
                      return throwError(_data.message);
                    }

                    let file: PreimumizeTransferDirectdlContentDto = null;

                    if (sourceQuery instanceof SourceEpisodeQuery) {
                      _data.content.forEach(d => {
                        const filename = d.path;
                        if (!file && isEpisodeCodeMatchesFileName(sourceQuery.episodeCode, filename)) {
                          file = d;
                        }
                      });
                    } else if (sourceQuery instanceof SourceQuery) {
                      const files: PreimumizeTransferDirectdlContentDto[] = [];
                      let hasIncompatibleFile = false;
                      _data.content.forEach(_file => {
                        const ext = '.' + _file.link.split('.').pop();
                        const commonVideoExtensions = getSupportedMedia('video').split('|');

                        if (commonVideoExtensions.includes(ext)) {
                          files.push(_file);
                        } else {
                          hasIncompatibleFile = true;
                        }
                      });

                      if (files.length === 0 && hasIncompatibleFile) {
                        return throwError(`The file ${_data.content[0].link} is not a video format`);
                      }

                      files.sort((stream1, stream2) => {
                        if (+stream1.size === +stream2.size) {
                          return 0;
                        }

                        return +stream1.size > +stream2.size ? -1 : 1;
                      });

                      if (sourceQuery.title) {
                        const filterTitle = cleanTitle(sourceQuery.title);

                        const year = sourceQuery.year;
                        files.forEach(_file => {
                          const names = _file.path.split('/');
                          if (names.length > 1) {
                            names.shift();
                          }

                          const title = cleanTitle(names.join('/'));

                          if (!file && title.indexOf(filterTitle) !== -1 && ( (year && title.indexOf(year.toString()) !== -1) || !year)) {
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
                      } else {
                        if (sourceQuery && files.length > 0) {
                          // Sort by name
                          files.sort((stream1, stream2) => {
                            if (stream1.path === stream2.path) {
                              return 0;
                            }

                            return stream1.path > stream2.path ? 1 : -1;
                          });

                          const debridSourceFiles: DebridSourceFile[] = [];

                          files.forEach(file => {
                            const names = file.path.split('/');
                            if (names.length > 1) {
                              names.shift();
                            }

                            const title = names.join('/');

                            const debridSourceFile = new DebridSourceFile(torrent.title, file.link, title, !!file.stream_link, file.stream_link);

                            debridSourceFiles.push(debridSourceFile);
                          });

                          return of(debridSourceFiles);
                        }
                      }
                    }

                    if (file) {
                      const debridSourceFile = new DebridSourceFile(torrent.title, file.link, file.path, !!file.stream_link, file.stream_link);

                      return of(debridSourceFile);
                    }

                    const debridSourceFiles: DebridSourceFile[] = [];

                    _data.content.forEach(_file => {
                      const ext = '.' + _file.link.split('.').pop();
                      const commonVideoExtensions = getSupportedMedia('video').split('|');

                      if (!commonVideoExtensions.includes(ext)) {
                        return;
                      }
                      const names = _file.path.split('/');
                      if (names.length > 1) {
                        names.shift();
                      }

                      const title = names.join('/');

                      const debridSourceFile = new DebridSourceFile(torrent.title, _file.link, title, !!_file.stream_link, _file.stream_link);

                      debridSourceFiles.push(debridSourceFile);
                    });

                    return of(debridSourceFiles.length === 1 ? debridSourceFiles.pop() : debridSourceFiles);
                  })
                );


                debridSources.push(debridSource);
              }
            }
          });
        });

        return debridSources;
      }),
      catchError(err => {
        logData(err);

        return of(debridSources);
      })
    );
  }
}
