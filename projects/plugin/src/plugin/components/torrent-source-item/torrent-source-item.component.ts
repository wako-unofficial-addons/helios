import { Component, Input } from '@angular/core';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { OpenSourceService } from '../../services/open-source.service';
import { TorrentSource } from '../../entities/torrent-source';

@Component({
  selector: 'wk-torrent-source-item',
  templateUrl: 'torrent-source-item.component.html',
  styleUrls: ['torrent-source-item.component.scss']
})
export class TorrentSourceItemComponent {
  @Input()
  source: TorrentSource;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  @Input()
  isBestSource: boolean;

  constructor(private openSourceService: OpenSourceService) {}

  download() {
    this.openSourceService.openTorrentSource(this.source, this.kodiOpenMedia);
  }
}
