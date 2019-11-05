import { TmdbApiService } from '../../services/tmdb-api.service';
import { TmdbSeasonDto } from '../../dtos/tmdb-season.dto';

export class TmdbSeasonGetByIdForm {
  static submit(tmdbId: number, seasonNumber: number) {
    return TmdbApiService.get<TmdbSeasonDto>(
      `/tv/${tmdbId}/season/${seasonNumber}`,
      null,
      '1d'
    );
  }
}
