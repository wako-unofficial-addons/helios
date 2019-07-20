import { RealDebridApiService } from '../../services/real-debrid-api.service';
import { switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { RealDebridStreamingTranscodeDto } from '../../dtos/streaming/real-debrid-streaming-transcode.dto';

export class RealDebridStreamingTranscodeForm {
  static submit(id: string): Observable<RealDebridStreamingTranscodeDto> {
    // This should works, but with generated token we don't have permission to call it
    // return RealDebridApiService.get<RealDebridTorrentsAddMagnetDto>(`/streaming/transcode/${id}`);
    // This is the hack

    return RealDebridApiService.request<string>({
      method: 'GET',
      url: `https://real-debrid.com/streaming-${id}`
    }).pipe(
      switchMap(html => {
        const match = html.match(/tokenBearer = '([^']*)/);
        if (match) {
          const token = match[1];
          if (token) {
            return RealDebridApiService.request<RealDebridStreamingTranscodeDto>({
              method: 'GET',
              url: RealDebridApiService.getApiBaseUrl() + `/streaming/transcode/${id}`,
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
          }
        }
        return of(null);
      })
    );
  }
}
