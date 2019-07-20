import { Component, Input } from '@angular/core';
import { Torrent } from '../../entities/torrent';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { OpenSourceService } from '../../services/open-source.service';

@Component({
  selector: 'wk-source-item',
  templateUrl: 'source-item.component.html',
  styleUrls: ['source-item.component.scss']
})
export class SourceItemComponent {
  @Input()
  torrent: Torrent;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  constructor(private openSourceService: OpenSourceService) {
  }

  download() {
    this.openSourceService.open(this.torrent, this.kodiOpenMedia);
  }
}
