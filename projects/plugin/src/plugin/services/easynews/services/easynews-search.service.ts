import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EasynewsApiService } from './easynews-api.service';
import { StreamLink, StreamLinkSource } from '../../../entities/stream-link-source';
import { SourceQuery } from '../../../entities/source-query';
import { SourceQuality } from '../../../entities/source-quality';

interface EasynewsResponse {
  data: EasynewsFile[];
  downURL: string;
}

interface EasynewsFile {
  fn: string; // filename
  hash: string; // unique hash
  size: number; // file size in bytes
  extension: string; // file extension
  subject: string; // post subject
  groups: string; // newsgroups
  poster: string; // poster name/email
  yres: number; // video height
  xres: number; // video width
  fps: number; // frames per second
  runtime: number; // duration in seconds
  vcodec: string; // video codec
  acodec: string; // audio codec
}

export class EasynewsSearchService {
  static search(query: SourceQuery): Observable<StreamLinkSource[]> {
    const searchQuery = this.buildSearchQuery(query);
    return this.searchApi(searchQuery).pipe(
      map((response: EasynewsResponse) => {
        if (!response?.data) {
          return [];
        }

        return response.data.map((file: EasynewsFile) => {
          const downloadUrl = this.buildDownloadUrl(response.downURL, file);
          const streamLink: StreamLink = {
            url: downloadUrl,
            title: file.fn,
            filename: file.fn + file.extension,
            isStreamable: true,
            transcodedUrl: downloadUrl,
            servicePlayerUrl: downloadUrl,
          };

          const source: StreamLinkSource = {
            id: file.hash,
            title: file.fn,
            size: file.size,
            quality: this.getQualityFromResolution(file.yres),
            type: 'direct',
            provider: 'Easynews',
            debridService: 'EN',
            originalUrl: downloadUrl,
            streamLinks: [streamLink],
            premiumizeTransferDirectdlDto: null,
            realDebridLinks: null,
            allDebridMagnetStatusMagnet: null,
            torboxTransferFiles: null,
            isPackage: false,
          };

          return source;
        });
      }),
    );
  }

  private static searchApi(query: string, params: any = {}): Observable<any> {
    const searchParams = {
      gps: query,
      sbj: 1, // Search in subject/title
      from: 0, // Start from result 0
      pby: 100, // Show 100 results per page
      sS: 1, // Sort by size
      sSend: 0, // Sort direction (0=desc)
      safeO: 1, // Adult filter
      sb: 1, // Sort by relevance
      fex: 'mkv,mp4,avi,mov,divx,xvid', // File extensions
      'fty[]': ['VIDEO'], // Content type
      spamf: 1, // Spam filter
      fly: 2, // Show full results
      ...params,
    };

    return EasynewsApiService.get(
      EasynewsApiService.addParamsToUrl(EasynewsApiService.baseUrl, searchParams),
      {
        headers: EasynewsApiService.getHeaders(),
      },
      '30s',
      40000,
    );
  }

  private static buildDownloadUrl(baseUrl: string, file: EasynewsFile): string {
    const credentials = EasynewsApiService.getCredentials();
    baseUrl = baseUrl.replace(
      'https://',
      `https://${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@`,
    );
    return `${baseUrl}/${file.hash}/${file.fn}${file.extension}`;
  }

  private static getQualityFromResolution(height: number): SourceQuality {
    if (height >= 2160) return '2160p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    return 'other';
  }

  private static buildSearchQuery(query: SourceQuery): string {
    const searchTerms: string[] = [];

    if (query.movie) {
      searchTerms.push(query.movie.title);
      if (query.movie.year) {
        searchTerms.push(query.movie.year.toString());
      }
    } else if (query.episode) {
      searchTerms.push(query.episode.title);
      if (query.episode.seasonNumber && query.episode.episodeNumber) {
        searchTerms.push(
          `S${query.episode.seasonNumber.toString().padStart(2, '0')}E${query.episode.episodeNumber.toString().padStart(2, '0')}`,
        );
      }
    } else if (query.query) {
      searchTerms.push(query.query);
    }

    return searchTerms.join(' ');
  }
}
