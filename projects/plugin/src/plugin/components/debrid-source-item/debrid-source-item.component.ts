import { Component, Input } from '@angular/core';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { OpenSourceService } from '../../services/open-source.service';
import { DebridSource } from '../../entities/debrid-source';
import { StreamLinkSource } from '../../entities/stream-link-source';
import { SourceQuery } from '../../entities/source-query';

@Component({
  selector: 'wk-debrid-source-item',
  templateUrl: 'debrid-source-item.component.html',
  styleUrls: ['debrid-source-item.component.scss']
})
export class DebridSourceItemComponent {
  @Input()
  source: StreamLinkSource;

  @Input()
  sourceQuery: SourceQuery;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  @Input()
  isBestSource: boolean;

  constructor(private openSourceService: OpenSourceService) {
  }

 async download() {
    await this.openSourceService.openStreamLinkSource(this.source, this.sourceQuery, this.kodiOpenMedia);
  }
}
