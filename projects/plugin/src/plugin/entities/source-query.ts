
export class SourceMovieQuery {
  imdbId: string;
  year: number;
  title: string;
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
  isAnime: boolean;
  tvdbId: number;
  showTvdbId: number;
  showTraktId: number;
}

export interface SourceQuery {
  query?: string; // Manual search
  movie?: SourceMovieQuery;
  episode?: SourceEpisodeQuery;
  category: 'movie' | 'tv' | 'anime';
}
