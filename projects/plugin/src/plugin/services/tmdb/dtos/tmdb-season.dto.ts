import { TmdbEpisodeDto } from './tmdb-episode.dto';

export interface TmdbSeasonDto {
  air_date: string;
  episodes: TmdbEpisodeDto[];
}
