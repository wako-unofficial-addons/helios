import { SourceQuery } from '../../../entities/source-query';
import { isVideoFile } from '../../../services/tools';
import { map } from 'rxjs/operators';
import { StreamLinkSource } from '../../../entities/stream-link-source';
import { Link } from '../../../entities/link';
import { StreamLinksFromLinksQuery } from '../stream-links-from-links.query';

export class PremiumizeGetStreamLinkQuery {
  static getData(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery) {
    return streamLinkSource.premiumizeTransferDirectdlDto.pipe(
      map((dto) => {
        if (dto.status !== 'success') {
          throw new Error('Premiumize.me: ' + dto.message);
        }

        const links: Link[] = [];

        dto.content.forEach((_file) => {
          if (isVideoFile(_file.link)) {
            links.push({
              filename: _file.path.split('/').pop(),
              size: _file.size,
              streamLink: _file.stream_link,
              url: _file.link,
              servicePlayerUrl: null
            });
          }
        });

        return StreamLinksFromLinksQuery.getData(streamLinkSource, sourceQuery, links);
      })
    );
  }
}
