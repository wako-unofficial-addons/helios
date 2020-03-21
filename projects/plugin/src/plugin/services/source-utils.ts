import { SourceQuality } from '../entities/source-quality';
import { SourceEpisodeQuery, SourceMovieQuery, SourceQuery } from '../entities/source-query';
import { add0 } from './tools';
import { SourceVideoMetadata } from '../entities/base-source';

export class SourceUtils {
  static convertSizeStrToBytes(sizeStr: string) {
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

  static getQuality(title: string) {
    let quality: SourceQuality = 'other';

    if (typeof title !== 'string') {
      return quality;
    }

    title = title.toLowerCase();

    switch (true) {
      case title.match('2160p') !== null:
      case title.match(' 4K') !== null:
        quality = '2160p';
        break;
      case title.match('1080p') !== null:
      case title.match(' 1080 ') !== null:
        quality = '1080p';
        break;
      case title.match('720p') !== null:
      case title.match(' 720 ') !== null:
      case title.match(' hd ') !== null:
        quality = '720p';
        break;
      default:
        quality = 'other';
    }

    return quality;
  }

  static stripAccents(str: string) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  static stripNonAsciiAndUnprintable(str: string) {
    return str.replace(/[^\x20-\x7F]/g, '');
  }

  static cleanTitle(title: string, apostropheReplacement: 's' | '' | ' s' = 's') {
    title = title.toLowerCase();
    title = this.stripAccents(title);
  //  title = this.stripNonAsciiAndUnprintable(title);

    title = title.replace(`\\'s`, apostropheReplacement);
    title = title.replace(`'s`, apostropheReplacement);
    title = title.replace('&#039;s', apostropheReplacement);
    title = title.replace(' 039 s', apostropheReplacement);

    title = title.replace(/\:|\\|\/|\,|\!|\?|\(|\)|\'|\’|\"|\+|\[|\]|\-|\_|\.|\{|\}/g, ' ');
    title = title.replace(/\s+/g, ' ');
    title = title.replace(/\&/g, 'and');

    return title.trim();
  }

  static cleanTags(title: string) {
    title = title.toLowerCase().trim();

    if (title[0] === '[' && title.indexOf(']') > 0) {
      title = title.substr(title.indexOf(']') + 1).trim();
      return this.cleanTags(title);
    }
    if (title[0] === '(' && title.indexOf(')') > 0) {
      title = title.substr(title.indexOf(')') + 1).trim();
      return this.cleanTags(title);
    }
    if (title[0] === '{' && title.indexOf('}') > 0) {
      title = title.substr(title.indexOf('}') + 1).trim();
      return this.cleanTags(title);
    }

    title = title.replace(/\(|\)|\[|\]|\{|\}/g, ' ');
    title = title.replace(/\s+/g, ' ');

    return title;
  }

  static removeSeparator(releaseTitle: string, title: string) {
    function checkForSep(t: string, sep: string) {
      if (
        t.match(sep) !== null &&
        t.substr(t.indexOf(sep) + 1)
          .trim()
          .toLowerCase()
          .startsWith(title)
      ) {
        return t.substr(t.indexOf(sep) + 1).trim();
      }
      return t;
    }

    releaseTitle = checkForSep(releaseTitle, '/');
    releaseTitle = checkForSep(releaseTitle, ' - ');

    return releaseTitle;
  }

  static removeWWWUrl(releaseTitle: string, title: string) {
    const regex = new RegExp(/www.[^.]+.[a-z]+/ig);
    if (releaseTitle.match(regex) !== null && title.match(regex) === null) {
      return releaseTitle.replace(regex, '');
    }
    return releaseTitle;
  }

  static removeFromTitle(title: string, target: string, clean = true) {
    if (target === '') {
      return title;
    }

    title = title.replace(` ${target.toLowerCase()} `, ' ');
    title = title.replace(`.${target.toLowerCase()}.`, ' ');
    title = title.replace(`+${target.toLowerCase()}+`, ' ');
    title = title.replace(`-${target.toLowerCase()}-`, ' ');

    if (clean) {
      title = this.cleanTitle(title) + ' ';
    } else {
      title = title + ' ';
    }
    return title.replace(/\s+/g, ' ');
  }

  static cleanDotAbbr(title: string) {
    return title.replace(/([A-Z])\./g, '$1');
  }


  static isTitleMatching(releaseTitle: string, title: string, sourceQuery: SourceMovieQuery | SourceEpisodeQuery, addSpaceAtTheEnd = false) {
    title = this.cleanTitle(' ' + title + ' ');

    releaseTitle = this.cleanTags(releaseTitle);

    releaseTitle = this.removeFromTitle(releaseTitle, this.getQuality(releaseTitle), false);
    releaseTitle = this.removeSeparator(releaseTitle, title);
    releaseTitle = this.removeWWWUrl(releaseTitle, title);
    releaseTitle = this.cleanTitle(releaseTitle) + ' ';

    if (addSpaceAtTheEnd) {
      title += ' ';
    }

    if (releaseTitle.startsWith(title)) {
      return true;
    }

    const year = (sourceQuery.year || '').toString();


    releaseTitle = this.removeFromTitle(releaseTitle, year);
    title = this.removeFromTitle(title, year);

    if (releaseTitle.startsWith(title)) {
      return true;
    }

    return false;
  }


  static checkEpisodeNumberMatch(releaseTitle: string) {
    releaseTitle = this.cleanTitle(releaseTitle);

    return releaseTitle.match(/(s\d+e[a-z]*\d+ )|(s\d+ *e\d+ )|(season \d+ episode \d+)/ig) !== null;

  }

  static isWordMatching(releaseTitle: string, title: string, minWords = 3) {

    title = this.stripAccents(title);

    const placeholder = 'ZZOOPPQQ';
    const nameAndNumberMatches = title.match(/[a-z]+\s+[0-9]+/ig);

    let hasBeenFixed = false;
    if (nameAndNumberMatches) {
      nameAndNumberMatches.forEach(str => {
        const regExp = new RegExp(str, 'g');
        title = title.replace(regExp, str.replace(/\s/, placeholder));
      });
      hasBeenFixed = true;

    }

    let words = title
      .replace(/[^0-9a-z]/gi, ' ')
      .split(' ')
      .filter(word => word.trim().length >= 2);

    if (words.length >= minWords) {

      if (hasBeenFixed) {
        const regExp = new RegExp(placeholder, 'g');
        words = words.map(word => {
          return word.replace(regExp, ' ');
        });
      }

      words = words.map(word => {
        return word + ' ';
      });

      const regexStr = words.join('.*');
      const regex = new RegExp(regexStr, 'ig');

      if (releaseTitle.match(regex) !== null) {
        return true;
      }

      releaseTitle = this.cleanTags(releaseTitle);

      releaseTitle = this.removeFromTitle(releaseTitle, this.getQuality(releaseTitle), false);
      releaseTitle = this.removeSeparator(releaseTitle, title);
      releaseTitle = this.removeWWWUrl(releaseTitle, title);
      releaseTitle = this.cleanTitle(releaseTitle) + ' ';
      if (releaseTitle.match(regex) !== null) {
        return true;
      }
    }
    return false;
  }

  static isMovieTitleMatching(releaseTitle: string, searchQuery: string, sourceQuery: SourceMovieQuery) {
    if (searchQuery === sourceQuery.imdbId) {
      searchQuery = sourceQuery.title;
    }

    releaseTitle = releaseTitle.toLowerCase();

    const year = sourceQuery.year ? sourceQuery.year.toString() : '';
    const title = this.cleanTitle(searchQuery.replace(year, ''));
    const titleBroken1 = this.cleanTitle(searchQuery, '');
    const titleBroken2 = this.cleanTitle(searchQuery, ' s');

    if (this.isWordMatching(releaseTitle, title)) {
      return true;
    }


    if (!this.isTitleMatching(releaseTitle, title, sourceQuery) && !this.isTitleMatching(releaseTitle, titleBroken1, sourceQuery) && !this.isTitleMatching(releaseTitle, titleBroken2, sourceQuery)) {
      return false;
    }

    let hasExclusion = false;
    ['soundtrack', 'gesproken'].forEach(exclusion => {
      if (releaseTitle.match(exclusion) !== null) {
        hasExclusion = true;
      }
    });

    if (hasExclusion) {
      return false;
    }

    if (releaseTitle.match(year) === null) {
      return false;
    }

    if (releaseTitle.match('xxx') !== null && title.match('xxx') === null) {
      return false;
    }

    return true;
  }

  static isEpisodeTitleMatching(releaseTitle: string, searchQuery: string, sourceQuery: SourceEpisodeQuery) {
    const showTitle = sourceQuery.title;
    const episodeTitle = sourceQuery.episodeTitle;
    const season = sourceQuery.seasonNumber;
    const episode = sourceQuery.episodeNumber;
    const absoluteNumber = sourceQuery.absoluteNumber;

    const seasonEpisodeCheck = `s${season}e${episode}`;
    const seasonEpisodeFillCheck = `s${season}e${add0(episode)}`;
    const seasonFillEpisodeFillCheck = `s${add0(season)}e${add0(episode)}`;
    const seasonEpisodeFullCheck = `season ${season} episode ${episode}`;
    const seasonEpisodeFillFullCheck = `season ${season} episode ${add0(episode)}`;
    const seasonFillEpisodeFillFullCheck = `season ${add0(season)} episode ${add0(episode)}`;

    const stringList = [];

    stringList.push(seasonEpisodeCheck);
    stringList.push(seasonEpisodeFillCheck);
    stringList.push(seasonFillEpisodeFillCheck);
    stringList.push(seasonEpisodeFullCheck);
    stringList.push(seasonEpisodeFillFullCheck);
    stringList.push(seasonFillEpisodeFillFullCheck);

    if (sourceQuery.isAnime && absoluteNumber) {
      stringList.unshift(absoluteNumber);
    }

    const titles = [
      showTitle,
      episodeTitle + ' ' + showTitle,
      showTitle + ' ' + episodeTitle
    ];

    titles.forEach(title => {
      const cleaned = this.cleanDotAbbr(title);
      if (cleaned !== title) {
        titles.push(cleaned);
      }
    });


    for (const title of titles) {
      for (const code of stringList) {
        if (this.isWordMatching(releaseTitle, title + ' ' + code)) {
          return true;
        }

        if (this.isTitleMatching(releaseTitle, title + ' ' + code, sourceQuery)) {
          return true;
        }
      }
    }

    return false;
  }


  static isSeasonPackTitleMatching(releaseTitle: string, searchQuery: string, sourceQuery: SourceEpisodeQuery) {
    const episodeNumberMatch = this.checkEpisodeNumberMatch(releaseTitle);
    if (episodeNumberMatch) {
      return false;
    }

    const showTitle = sourceQuery.title;
    const season = sourceQuery.seasonNumber;


    const seasonFill = add0(season);
    const seasonCheck = `s${season} `;
    const seasonFillCheck = `s${seasonFill} `;
    const seasonFullCheck = `season ${season} `;
    const seasonFullFillCheck = `season ${seasonFill} `;
    const seasonFullPack = `S01-`;
    const seasonFullPackFull = `season 1-`;

    const stringList = [];

    stringList.push(seasonFill);
    stringList.push(seasonCheck);
    stringList.push(seasonFillCheck);
    stringList.push(seasonFullCheck);
    stringList.push(seasonFullFillCheck);
    stringList.push(seasonFullPack);
    stringList.push(seasonFullPackFull);


    const titles = [
      showTitle
    ];

    titles.forEach(title => {
      const cleaned = this.cleanDotAbbr(title);
      if (cleaned !== title) {
        titles.push(cleaned);
      }
    });

    for (const title of titles) {
      for (const code of stringList) {
        if (this.isWordMatching(releaseTitle, title + ' ' + code)) {
          if ((code === seasonFullPack || code === seasonFullPackFull) && !this.isMatchingFullPack(releaseTitle, sourceQuery.seasonNumber, code)) {
            continue;
          }
          return true;
        }

        if (this.isTitleMatching(releaseTitle, title + ' ' + code, sourceQuery, code.substr(-1, 1) === ' ')) {
          if ((code === seasonFullPack || code === seasonFullPackFull) && !this.isMatchingFullPack(releaseTitle, sourceQuery.seasonNumber, code)) {
            continue;
          }
          return true;
        }
      }
    }

    return false;
  }

  static isMatchingFullPack(releaseTitle: string, seasonNumber: number, fullPackCode: string) {
    let maxSeasonNumber = 0;
    if (fullPackCode === 'season 1-') {
      const matches = releaseTitle.match(/season 1-([0-9]+)/i);
      if (matches && matches[1]) {
        maxSeasonNumber = +matches[1];
      }
    } else if (fullPackCode === 'S01-') {
      const matches = releaseTitle.match(/S01-S([0-9]+)/i);
      if (matches && matches[1]) {
        maxSeasonNumber = +matches[1];
      }
    }
    return seasonNumber < maxSeasonNumber;
  }


  static getVideoMetadata(releaseTitle: string, sourceQuery: SourceQuery) {
    let title = '';

    const videoMetadata = {} as SourceVideoMetadata;

    if (sourceQuery.query) {
      title = sourceQuery.query;
    }

    if (sourceQuery.movie) {
      title = sourceQuery.movie.title;
    }

    if (sourceQuery.episode) {
      title = sourceQuery.episode.title;
    }

    videoMetadata.isCam = title.match(/hdcam/gi) === null && releaseTitle.match(/hdcam/gi) !== null;
    videoMetadata.is3D = title.match(/3D/gi) === null && releaseTitle.match(/3D/gi) !== null;

    return videoMetadata;
  }
}
