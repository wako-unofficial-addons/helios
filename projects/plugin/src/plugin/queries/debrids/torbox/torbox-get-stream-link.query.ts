import { SourceQuery } from '../../../entities/source-query';
import { StreamLinkSource } from '../../../entities/stream-link-source';
import { map } from 'rxjs/operators';
import { Link } from '../../../entities/link';
import { StreamLinksFromLinksQuery } from '../stream-links-from-links.query';

export class TorboxGetStreamLinkQuery {
  static getData(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery) {
    return streamLinkSource.torboxTransferFiles.pipe(
      map((dto) => {
        if (dto.status !== 'success') {
          throw new Error('Torbox: ' + dto.error?.message || 'Unknown error');
        }

        const links: Link[] = [];
        dto.data.files.forEach((file) => {
          links.push({
            filename: file.name,
            size: file.size,
            streamLink: file.stream_url,
            url: file.download_url,
            servicePlayerUrl: null,
          });
        });

        return StreamLinksFromLinksQuery.getData(streamLinkSource, sourceQuery, links);
      }),
    );
  }
}
