import { StreamLink, StreamLinkSource } from '../../entities/stream-link-source';
import { SourceQuery } from '../../entities/source-query';
import { Link } from '../../entities/link';
import { cleanTitle, incrementEpisodeCode, isEpisodeCodeMatchesFileName } from '../../services/tools';

export class StreamLinksFromLinksQuery {
  static sortByNameAsc(files: Link[]) {
    files.sort((stream1, stream2) => {
      if (stream1.filename === stream2.filename) {
        return 0;
      }

      return stream1.filename > stream2.filename ? 1 : -1;
    });
  }

  static sortBySizeDesc(files: Link[]) {
    files.sort((stream1, stream2) => {
      if (+stream1.size === +stream2.size) {
        return 0;
      }

      return +stream1.size > +stream2.size ? -1 : 1;
    });
  }

  static removeSampleLinks(links: Link[]) {
    return links.filter(link => link.filename.match('sample') === null);
  }

  static getData(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery, links: Link[]) {
    if (streamLinkSource.title.match('sample') === null) {
      // Remove sample
      links = this.removeSampleLinks(links);
    }

    const streamLinks: StreamLink[] = [];

    this.sortByNameAsc(links);

    if (sourceQuery.episode) {

      let currentEpisodeFound = false;

      let episodeCode = sourceQuery.episode.episodeCode;
      let error = false;

      links.forEach(link => {
        if (error) {
          return;
        }
        const filename = link.filename;
        if (isEpisodeCodeMatchesFileName(episodeCode, filename)) {


          currentEpisodeFound = true;
          try {
            episodeCode = incrementEpisodeCode(episodeCode);
          } catch (e) {
            error = true;
          }

          const streamLink = new StreamLink(streamLinkSource.title, link.url, link.filename, !!link.streamLink, link.streamLink, link.servicePlayerUrl);

          streamLinks.push(streamLink);
        }
      });

      if (currentEpisodeFound) {
        return streamLinks;
      }
    }

    if (sourceQuery.movie) {

      let foundLink: Link = null;

      this.sortBySizeDesc(links);

      const filterTitle = cleanTitle(sourceQuery.movie.title);

      const year = sourceQuery.movie.year;
      links.forEach(link => {

        const title = cleanTitle(link.filename);

        if (!foundLink && title.indexOf(filterTitle) !== -1 && ((year && title.indexOf(year.toString()) !== -1) || !year)) {
          foundLink = link;
        }
      });

      if (!foundLink) {
        links.forEach(link => {
          const _title = cleanTitle(link.filename);

          if (!foundLink && _title.indexOf(filterTitle) !== -1) {
            foundLink = link;
          }
        });
      }

      if (!foundLink && links.length === 1) {
        foundLink = links[0];
      }

      if (foundLink) {
        streamLinks.push(
          new StreamLink(streamLinkSource.title, foundLink.url, foundLink.filename, !!foundLink.streamLink, foundLink.streamLink, foundLink.servicePlayerUrl)
        );

        return streamLinks;
      }
    }

    links.forEach(link => {
      streamLinks.push(
        new StreamLink(link.filename, link.url, link.filename, !!link.streamLink, link.streamLink, link.servicePlayerUrl)
      );

    });

    return streamLinks;
  }
}
