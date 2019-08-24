export class SourceQuery {
  imdbId: string;
  year: number;
  title: string;
  alternativeTitles?: { [key: string]: string };
  originalTitle?: string;
}

export class SourceEpisodeQuery extends SourceQuery {
  episodeNumber: number;
  seasonNumber: number;
  episodeCode: string;
  seasonCode: string;
}
