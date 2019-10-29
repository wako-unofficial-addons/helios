import { SourceQuality } from '../entities/source-quality';
import { SourceEpisodeQuery, SourceMovieQuery } from '../entities/source-query';
import { add0 } from './tools';

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

  static cleanTitle(title: string, apostrophe_replacement: 's' | '' | ' s' = 's') {
    title = title.toLowerCase();
    title = this.stripAccents(title);
    title = this.stripNonAsciiAndUnprintable(title);

    title = title.replace(`\\'s`, apostrophe_replacement);
    title = title.replace(`'s`, apostrophe_replacement);
    title = title.replace('&#039;s', apostrophe_replacement);
    title = title.replace(' 039 s', apostrophe_replacement);

    title = title.replace(/\:|\\|\/|\,|\!|\?|\(|\)|\'|\’|\"|\+|\[|\]|\-|\_|\.|\{|\}/g, ' ');
    title = title.replace(/\s+/g, ' ');
    title = title.replace(/\&/g, 'and');

    return title.trim();
  }

  static cleanTags(title: string) {
    title = title.toLowerCase().trim();

    if (title[0] == '[' && title.indexOf(']') > 0) {
      title = title.substr(title.indexOf(']') + 1).trim();
      return this.cleanTags(title);
    }
    if (title[0] == '(' && title.indexOf(')') > 0) {
      title = title.substr(title.indexOf(')') + 1).trim();
      return this.cleanTags(title);
    }
    if (title[0] == '{' && title.indexOf('}') > 0) {
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
    releaseTitle = checkForSep(releaseTitle, '-');

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

  static isTitleMatching(release_title: string, title: string, sourceQuery: SourceMovieQuery | SourceEpisodeQuery, code?: string) {
    title = this.cleanTitle(' ' + title + ' ');


    release_title = this.cleanTags(release_title);

    release_title = this.removeFromTitle(release_title, this.getQuality(release_title), false);
    release_title = this.removeSeparator(release_title, title);
    release_title = this.removeWWWUrl(release_title, title);
    release_title = this.cleanTitle(release_title) + ' ';

    if (release_title.startsWith(title)) {
      return true;
    }

    const year = (sourceQuery.year || '').toString();


    release_title = this.removeFromTitle(release_title, year);
    title = this.removeFromTitle(title, year);

    if (release_title.startsWith(title)) {
      return true;
    }

    return false;
  }


  static checkEpisodeNumberMatch(release_title: string) {
    release_title = this.cleanTitle(release_title);

    return release_title.match(/(s\d+ *e\d+ )|(season \d+ episode \d+)/ig) !== null;

  }

  static isWordMatching(release_title: string, title: string) {
    const words = title
      .replace(/[^0-9a-z]/gi, ' ')
      .split(' ')
      .filter(word => word.trim().length >= 3);

    if (words.length >= 3) {
      const regexStr = words.join('.*');
      const regex = new RegExp(regexStr, 'ig');

      if (release_title.match(regex) !== null) {
        return true;
      }
    }
    return false;
  }

  static isMovieTitleMatching(release_title: string, searchQuery: string, sourceQuery: SourceMovieQuery) {
    if (searchQuery === sourceQuery.imdbId) {
      searchQuery = sourceQuery.title;
    }

    release_title = release_title.toLowerCase();

    const year = sourceQuery.year ? sourceQuery.year.toString() : '';
    const title = this.cleanTitle(searchQuery.replace(year, ''));
    const title_broken_1 = this.cleanTitle(searchQuery, '');
    const title_broken_2 = this.cleanTitle(searchQuery, ' s');


    if (this.isWordMatching(release_title, title)) {
      return true;
    }


    if (!this.isTitleMatching(release_title, title, sourceQuery) && !this.isTitleMatching(release_title, title_broken_1, sourceQuery) && !this.isTitleMatching(release_title, title_broken_2, sourceQuery)) {
      return false;
    }

    let hasExclusion = false;
    ['soundtrack', 'gesproken'].forEach(exclusion => {
      if (release_title.match(exclusion) !== null) {
        hasExclusion = true;
      }
    });

    if (hasExclusion) {
      return false;
    }

    if (release_title.match(year) === null) {
      return false;
    }

    if (release_title.match('xxx') !== null && title.match('xxx') === null) {
      return false;
    }

    return true;
  }

  static isEpisodeTitleMatching(release_title: string, searchQuery: string, sourceQuery: SourceEpisodeQuery) {
    const show_title = sourceQuery.title;
    const episode_title = sourceQuery.episodeTitle;
    const season = sourceQuery.seasonNumber;
    const episode = sourceQuery.episodeNumber;
    const absoluteNumber = sourceQuery.absoluteNumber;

    const season_episode_check = `s${season}e${episode}`;
    const season_episode_fill_check = `s${season}e${add0(episode)}`;
    const season_fill_episode_fill_check = `s${add0(season)}e${add0(episode)}`;
    const season_episode_full_check = `season ${season} episode ${episode}`;
    const season_episode_fill_full_check = `season ${season} episode ${add0(episode)}`;
    const season_fill_episode_fill_full_check = `season ${add0(season)} episode ${add0(episode)}`;

    const string_list = [];

    string_list.push(season_episode_check);
    string_list.push(season_episode_fill_check);
    string_list.push(season_fill_episode_fill_check);
    string_list.push(season_episode_full_check);
    string_list.push(season_episode_fill_full_check);
    string_list.push(season_fill_episode_fill_full_check);

    if (sourceQuery.isAnime && absoluteNumber) {
      string_list.unshift(absoluteNumber);
    }

    const titles = [
      show_title,
      episode_title + ' ' + show_title,
      show_title + ' ' + episode_title,
    ];

    for (let title of titles) {
      for (let code of string_list) {
        if (this.isWordMatching(release_title, title + ' ' + code)) {
          return true;
        }

        if (this.isTitleMatching(release_title, title + ' ' + code, sourceQuery)) {
          return true;
        }
      }
    }

    return false;
  }

  static isSeasonPackTitleMatching(release_title: string, searchQuery: string, sourceQuery: SourceEpisodeQuery) {
    const episode_number_match = this.checkEpisodeNumberMatch(release_title);
    if (episode_number_match) {
      return false
    }

    const show_title = sourceQuery.title;
    const season = sourceQuery.seasonNumber;


    const season_fill = add0(season);
    const season_check = `s${season}`;
    const season_fill_check = `s${season_fill}`;
    const season_full_check = `season ${season}`;
    const season_full_fill_check = `season ${season_fill}`;

    const string_list = [];

    string_list.push(season_fill);
    string_list.push(season_check);
    string_list.push(season_fill_check);
    string_list.push(season_full_check);
    string_list.push(season_full_fill_check);

    for (let code of string_list) {
      if (this.isWordMatching(release_title, show_title + ' ' + code)) {
        return true;
      }

      if (this.isTitleMatching(release_title, show_title + ' ' + code, sourceQuery)) {
        return true;
      }
    }

    return false;
  }


}
