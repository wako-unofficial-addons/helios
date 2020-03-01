import { SourceQuery } from '../../../entities/source-query';
import { StreamLinkSource } from '../../../entities/stream-link-source';
import { finalize, last, map, mapTo, switchMap } from 'rxjs/operators';
import { AllDebridMagnetDeleteForm } from '../../../services/all-debrid/forms/magnet/all-debrid-magnet-delete.form';
import { StreamLinksFromLinksQuery } from '../stream-links-from-links.query';
import { Link } from '../../../entities/link';
import { concat } from 'rxjs';
import { AllDebridLinkUnlockForm } from '../../../services/all-debrid/forms/link/all-debrid-link-unlock.form';

export class AllDebridGetStreamLinkQuery {

  static getData(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery) {
    let magnetId = null;
    return streamLinkSource.allDebridMagnetStatusMagnet.pipe(
      finalize(() => {
        if (magnetId) {
          AllDebridMagnetDeleteForm.submit(magnetId).subscribe();
        }
      }),
      switchMap(magnet => {
        magnetId = magnet.id;
        const links: Link[] = [];
        magnet.links.forEach(file => {
          links.push({
            filename: file.filename,
            size: file.size,
            streamLink: null,
            url: file.link,
            servicePlayerUrl: null
          });
        });

        const streamLinks = StreamLinksFromLinksQuery.getData(streamLinkSource, sourceQuery, links);

        const obs = [];
        streamLinks.forEach(streamLink => {
          obs.push(
            AllDebridLinkUnlockForm.submit(streamLink.url)
              .pipe(map(dto => {
                streamLink.url = dto.data.link;
                // streamLink.isStreamable = true;
                // streamLink.transcodedUrl = streamLink.url;
                return streamLink;
              }))
          );
        });

        return concat(...obs)
          .pipe(
            last(),
            mapTo(streamLinks)
          );
      }),
      map(streamLinks => {
        return streamLinks;
      })
    );

  }
}
