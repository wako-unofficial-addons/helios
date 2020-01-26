import { SourceQuery } from '../../entities/source-query';
import { StreamLinkSource } from '../../entities/stream-link-source';
import { map } from 'rxjs/operators';
import { Link } from '../../entities/link';
import { StreamLinksFromLinksQuery } from './stream-links-from-links.query';

export class RealDebridGetStreamLinkQuery {

  static getData(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery) {
    return streamLinkSource.realDebridLinks.pipe(
      map(files => {

        const links: Link[] = [];
        files.forEach(file => {
          if (file.mimeType.match('video') !== null) {
            links.push({
              filename: file.filename,
              size: file.filesize,
              streamLink: file.streamable ? file.download : null,
              url: file.download,
              servicePlayerUrl: `https://real-debrid.com/streaming-${file.id}`
            });
          }
        });

        return StreamLinksFromLinksQuery.getData(streamLinkSource, sourceQuery, links);
      })
    );
  }
}
