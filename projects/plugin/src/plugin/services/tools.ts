import { Episode, KodiApiService, Movie, Show, wakoLog } from '@wako-app/mobile-sdk';
import { TorrentSource } from '../entities/torrent-source';
import { SourceByQuality } from '../entities/source-by-quality';
import { SourceEpisodeQuery, SourceMovieQuery, SourceQuery } from '../entities/source-query';
import { StreamLinkSource } from '../entities/stream-link-source';
import { KodiOpenMedia } from '../entities/kodi-open-media';

export function logData(...data: any) {
  wakoLog('plugin.helios', data);
}

export function logEvent(eventName: string, data: {}) {
  if ('FirebasePlugin' in window) {
    const firebase = window['FirebasePlugin'] as any;
    firebase.logEvent(eventName, data);
  }
}

export function countryCodeToEmoji(country: string) {
  country = country.toUpperCase();

  const offset = 127397;
  const A = 65;
  const Z = 90;

  const f = country.codePointAt(0);
  const s = country.codePointAt(1);

  if (country.length !== 2 || f > Z || f < A || s > Z || s < A) {
    throw new Error('Not an alpha2 country code');
  }

  return String.fromCodePoint(f + offset) + String.fromCodePoint(s + offset);
}

export function cleanFilename(filename: string) {
  let name = filename;
  const names = name.split('.');

  if (names.length > 1) {
    const ext = names.pop();
    name = names.join(' ') + '.' + ext;
  }

  const match = name.match(/(S[0-9]+E[0-9]+)/i);
  if (match) {
    name = match[0] + ' - ' + name;
  }
  return name;
}

export function convertSizeStrToBytes(sizeStr: string) {
  if (!sizeStr) {
    return null;
  }

  if (sizeStr.match(/GB|GiB/gi) !== null) {
    return +sizeStr.replace(/GB|GiB/gi, '') * 1024 * 1024 * 1024;
  }

  if (sizeStr.match(/MB|MiB/gi) !== null) {
    return +sizeStr.replace(/MB|MiB/gi, '') * 1024 * 1024;
  }

  if (sizeStr.match(/KB|KiB/gi) !== null) {
    return +sizeStr.replace(/KB|KiB/, '') * 1024;
  }

  return null;
}

export function getSupportedMedia(media) {
  if (media === 'video') {
    return '.m4v|.3g2|.3gp|.nsv|.tp|.ts|.ty|.strm|.pls|.rm|.rmvb|.mpd|.m3u|.m3u8|.ifo|.mov|.qt|.divx|.xvid|.bivx|.vob|.nrg|.img|.iso|.pva|.wmv|.asf|.asx|.ogm|.m2v|.avi|.bin|.dat|.mpg|.mpeg|.mp4|.mkv|.mk3d|.avc|.vp3|.svq3|.nuv|.viv|.dv|.fli|.flv|.rar|.001|.wpl|.vdr|.dvr-ms|.xsp|.mts|.m2t|.m2ts|.evo|.ogv|.sdp|.avs|.rec|.url|.pxml|.vc1|.h264|.rcv|.rss|.mpls|.webm|.bdmv|.wtv|.pvr|.disc';
  }
  if (media === 'music') {
    return '.nsv|.m4a|.flac|.aac|.strm|.pls|.rm|.rma|.mpa|.wav|.wma|.ogg|.mp3|.mp2|.m3u|.gdm|.imf|.m15|.sfx|.uni|.ac3|.dts|.cue|.aif|.aiff|.wpl|.ape|.mac|.mpc|.mp+|.mpp|.shn|.rar|.wv|.dsp|.xsp|.xwav|.waa|.wvs|.wam|.gcm|.idsp|.mpdsp|.mss|.spt|.rsd|.sap|.cmc|.cmr|.dmc|.mpt|.mpd|.rmt|.tmc|.tm8|.tm2|.oga|.url|.pxml|.tta|.rss|.wtv|.mka|.tak|.opus|.dff|.dsf|.cdda';
  }
  if (media === 'picture') {
    return '.png|.jpg|.jpeg|.bmp|.gif|.ico|.tif|.tiff|.tga|.pcx|.cbz|.cbr|.rar|.rss|.webp|.jp2|.apng';
  }
  return '';
}

export function add0(value: number) {
  if (value < 10) {
    return '0' + value;
  }

  return value;
}

export function torrentCacheStrings(episodeCode: string) {
  if (!episodeCode.match(/S([0-9]+)E([0-9]+)/i)) {
    return null;
  }
  const matches = episodeCode.match(/S([0-9]+)E([0-9]+)/i);

  const season2 = matches[1];
  const episode2 = matches[2];

  const season = +season2;
  const episode = +episode2;

  // KEEP SPACE AT THE END
  const episodeStrings = [
    `s${season2}e${episode2} `,
    `s${season2}e${episode2}e${add0(episode + 1)} `,
    `s${season2}e${add0(episode - 1)}e${episode2} `,
    `s${season}e${episode2} `,
    `s${season2}e${episode} `,
    `s${season}e${episode} `,
    `${season}x${episode} `,
    `${season2}x${episode2} `,
    `${season}x${episode2} `,
    `[${season2} ${episode}] `,
    `[${season} ${episode2}] `,
    `[${season} ${episode}] `,
    `[${season2}x${episode}] `,
    `[${season}x${episode2}] `,
    `[${season}x${episode}] `,
    // TODO SHOULD ADD EPISODE TITLE
    `${season}${episode2} `,
    `${season2}${episode2} `,
    `${season}.${episode2} `,
    `${season2}.${episode} `,
    `${season2}.${episode2} `
  ];

  const seasonStrings = [
    `season ${season} `,
    `season ${season2} `,
    `s${season} `,
    `s${season2} `,
    `series ${season2} `,
    `series ${season} `
  ];

  return {
    episodeStrings,
    seasonStrings,
    season2,
    episode2
  };
}

export function cleanTitleCustom(title: string, replacements: { [key: string]: string }) {
  Object.keys(replacements).forEach(charToReplace => {
    title = title.split(charToReplace).join(replacements[charToReplace]);
  });

  return title.toLowerCase();
}

export function cleanTitle(title: string) {
  title = title.toLowerCase();

  const apostrophe_replacement = 's';

  title = title.replace(`\\'s`, apostrophe_replacement);
  title = title.replace(`'s`, apostrophe_replacement);
  title = title.replace('&#039;s', apostrophe_replacement);
  title = title.replace(' 039 s', apostrophe_replacement);

  title = title.replace(/\:|\\|\/|\,|\!|\?|\(|\)|\'|\"|\\|\[|\]|\-|\_|\./g, ' ');
  title = title.replace(/\s+/g, ' ');
  title = title.replace('  ', ' ');
  title = title.replace(/\&/g, 'and');

  return title.trim();
}

export function sortTorrentsByPackage(sources: StreamLinkSource[] | TorrentSource[]) {
  sources.sort((torrent1, torrent2) => {
    const score1 = torrent1.isPackage;
    const score2 = torrent2.isPackage;

    if (score1 === score2) {
      return 0;
    }

    return score1 > score2 ? -1 : 1;
  });
}

export function sortTorrentsBySize(sources: StreamLinkSource[] | TorrentSource[]) {
  sources.sort((torrent1, torrent2) => {
    const score1 = torrent1.size;
    const score2 = torrent2.size;

    if (score1 === score2) {
      return 0;
    }

    return score1 > score2 ? -1 : 1;
  });
}

export function sortTorrentsBySeeds(torrents: TorrentSource[]) {
  torrents.sort((torrent1, torrent2) => {
    const score1 = torrent1.seeds;
    const score2 = torrent2.seeds;

    if (score1 === score2) {
      return 0;
    }

    return score1 > score2 ? -1 : 1;
  });
}

function getScoreTorrent(torrent: TorrentSource) {
  const downloadDiff = torrent.seeds - torrent.peers;

  let score = 0;

  if (downloadDiff >= 100) {
    score += 150;
  } else if (downloadDiff >= 20) {
    score += downloadDiff;
  } else if (downloadDiff < 20) {
    score -= 100;
  }

  if (torrent.seeds < 20) {
    score -= 100;
  }

  score += torrent.size / 1024 / 1024 / 1024;

  return score;
}

export function sortTorrentsBalanced(torrents: TorrentSource[]) {
  torrents.sort((torrent1, torrent2) => {
    const score1 = getScoreTorrent(torrent1);
    const score2 = getScoreTorrent(torrent2);

    if (score1 === score2) {
      return 0;
    }

    return score1 > score2 ? -1 : 1;
  });
}

export function isEpisodeCodeMatchesFileName(episodeCode: string, filename: string) {
  const codes = torrentCacheStrings(episodeCode);
  const ext = '.' + filename.split('.').pop();
  const commonVideoExtensions = getSupportedMedia('video').split('|');

  if (!commonVideoExtensions.includes(ext)) {
    return false;
  }

  let match = false;
  codes.episodeStrings.forEach(str => {
    if (!match && cleanTitle(filename).indexOf(str) !== -1) {
      match = true;
    }
  });

  if (!match && filename.toLowerCase().match('s' + codes.season2) && filename.toLowerCase().match('e' + codes.episode2)) {
    match = true;
  }

  return match;
}

export function getSourcesByQuality<T>(sources: StreamLinkSource[] | TorrentSource[], sortFunction: (source) => void) {
  const sourceByQuality: SourceByQuality<T> = {
    sources2160p: [],
    sources1080p: [],
    sources720p: [],
    sourcesOther: []
  };

  sources.forEach(source => {
    if (source.quality === '2160p') {
      sourceByQuality.sources2160p.push(source);
    } else if (source.quality === '1080p') {
      sourceByQuality.sources1080p.push(source);
    } else if (source.quality === '720p') {
      sourceByQuality.sources720p.push(source);
    } else {
      sourceByQuality.sourcesOther.push(source);
    }
  });

  sortFunction(sourceByQuality.sources2160p);
  sortFunction(sourceByQuality.sources1080p);
  sortFunction(sourceByQuality.sources720p);
  sortFunction(sourceByQuality.sourcesOther);

  return sourceByQuality;
}

export function getPreviousFileNamePlayed(traktId: number) {
  return 'helios_previousplayed_' + traktId;
}

export function getScoreMatchingName(sourceFileName: string, targetFileName: string) {
  let sfs = sourceFileName
    .toLowerCase()
    .split('/')
    .pop()
    .trim()
    .replace(/\./g, ' ')
    .split(' ');
  let tfs = targetFileName
    .toLowerCase()
    .trim()
    .replace(/\./g, ' ')
    .split(' ');

  let score = 0;
  sfs.forEach(word => {
    if (tfs.includes(word)) {
      score++;
    }
  });

  return score;
}

export function getSourceQueryMovie(movie: Movie) {
  const sourceMovieQuery = new SourceMovieQuery();

  sourceMovieQuery.imdbId = movie.imdbId;
  sourceMovieQuery.title = movie.title;
  sourceMovieQuery.alternativeTitles = movie.alternativeTitles;
  sourceMovieQuery.originalTitle = movie.originalTitle;
  sourceMovieQuery.year = movie.year;

  return {movie: sourceMovieQuery, category: 'movie'} as SourceQuery;
}

export function getSourceQueryEpisode(show: Show, episode: Episode, absoluteNumber?: number) {
  const sourceEpisodeQuery = new SourceEpisodeQuery();

  sourceEpisodeQuery.episodeNumber = episode.traktNumber;
  sourceEpisodeQuery.seasonNumber = episode.traktSeasonNumber;
  sourceEpisodeQuery.episodeCode = episode.code;
  sourceEpisodeQuery.seasonCode = 'S' + add0(episode.traktSeasonNumber).toString();
  sourceEpisodeQuery.imdbId = episode.imdbId;
  sourceEpisodeQuery.tvdbId = episode.tvdbId;
  sourceEpisodeQuery.showTvdbId = show.tvdbId;
  sourceEpisodeQuery.showTraktId = show.traktId;
  sourceEpisodeQuery.title = show.title;
  sourceEpisodeQuery.alternativeTitles = show.alternativeTitles;
  sourceEpisodeQuery.originalTitle = show.originalTitle;
  sourceEpisodeQuery.year = show.year;
  sourceEpisodeQuery.absoluteNumber = absoluteNumber;
  sourceEpisodeQuery.isAnime = show.genres.includes('anime');

  return {episode: sourceEpisodeQuery, category: sourceEpisodeQuery.isAnime ? 'anime' : 'tv'} as SourceQuery;
}

export function getEpisodeCode(seasonNumber: number, episodeNumber: number) {
  return 'S' + add0(seasonNumber) + 'E' + add0(episodeNumber);
}

export function incrementEpisodeCode(episodeCode: string) {
  const matches = episodeCode.match(/s([0-9]*)e([0-9]*)/i);
  if (matches) {
    return getEpisodeCode(+matches[1], +matches[2] + 1);
  }
  throw 'Invalid episode code';
}

export function addToKodiPlaylist(videoUrls: string[], kodiOpenMedia: KodiOpenMedia) {
  const items = [];
  let startEpisode = kodiOpenMedia.episode ? kodiOpenMedia.episode.traktNumber : null;
  videoUrls.forEach(videoUrl => {
    if (startEpisode) {
      startEpisode++;
    }

    if (kodiOpenMedia) {
      const openMedia = {
        movieTraktId: kodiOpenMedia.movie ? kodiOpenMedia.movie.traktId : null,
        showTraktId: kodiOpenMedia.show ? kodiOpenMedia.show.traktId : null,
        seasonNumber: kodiOpenMedia.episode ? kodiOpenMedia.episode.traktSeasonNumber : null,
        episodeNumber: startEpisode ? startEpisode : null
      };

      items.push({
        file:
          videoUrl +
          `|movieTraktId=${openMedia.movieTraktId}&showTraktId=${openMedia.showTraktId}&seasonNumber=${openMedia.seasonNumber}&episodeNumber=${openMedia.episodeNumber}`
      });
    }
  });

  return KodiApiService.doHttpAction('Playlist.Add', {
    playlistid: 1,
    item: items
  });
}
