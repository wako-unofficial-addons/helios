import { Component, Input } from '@angular/core';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { OpenSourceService } from '../../services/open-source.service';
import { DebridSource } from '../../entities/debrid-source';

@Component({
  selector: 'wk-debrid-source-item',
  templateUrl: 'debrid-source-item.component.html',
  styleUrls: ['debrid-source-item.component.scss']
})
export class DebridSourceItemComponent {
  @Input()
  source: DebridSource;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  @Input()
  isBestSource: boolean;

  constructor(private openSourceService: OpenSourceService) {
  }

  download() {
    this.openSourceService.openDebridSource(this.source, this.kodiOpenMedia);
  }
}
