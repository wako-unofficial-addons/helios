import { TvdbApiService } from '../../services/tvdb-api.service';
import { BaseDto } from '../../dtos/base.dto';
import { EpisodeDto } from '../../dtos/episodeDto';

export class TvdbEpisodeForm {
  static submit(tvdbId: number) {
    return TvdbApiService.get<BaseDto<EpisodeDto>>(
      `/episodes/${tvdbId}`,
      null,
      '1d'
    );
  }
}
