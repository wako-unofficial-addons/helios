
export class SourceMovieQuery {
  imdbId: string;
  tmdbId: number;
  year: number;
  title: string;
  defaultTitleLang: string;
  alternativeTitles?: { [key: string]: string };
  originalTitle?: string;
}



export class SourceEpisodeQuery extends SourceMovieQuery {
  episodeNumber: number;
  seasonNumber: number;
  episodeCode: string;
  seasonCode: string;
  episodeTitle: string;
  absoluteNumber?: number;
  latestAiredEpisode?: number;
  isAnime: boolean;
  tvdbId: number;
  showTvdbId: number;
  showTraktId: number;
  showTmdbId: number;
}

export interface SourceQuery {
  query?: string; // Manual search
  movie?: SourceMovieQuery;
  episode?: SourceEpisodeQuery;
  category: 'movie' | 'tv' | 'anime';
}
