import { Component, Input } from '@angular/core';
import { IonBadge, IonCol, IonGrid, IonIcon, IonRippleEffect, IonRow } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cubeOutline, trophyOutline } from 'ionicons/icons';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { TorrentSource } from '../../entities/torrent-source';
import { FileSizePipe } from '../../services/file-size.pipe';
import { OpenSourceService } from '../../services/open-source.service';

@Component({
  selector: 'wk-torrent-source-item',
  templateUrl: './torrent-source-item.component.html',
  styleUrls: ['./torrent-source-item.component.scss'],
  standalone: true,
  imports: [FileSizePipe, IonRippleEffect, IonIcon, IonGrid, IonRow, IonCol, IonBadge],
})
export class TorrentSourceItemComponent {
  @Input()
  source: TorrentSource;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  @Input()
  isBestSource: boolean;

  constructor(private openSourceService: OpenSourceService) {
    addIcons({ trophyOutline, cubeOutline });
  }

  download() {
    this.openSourceService.openTorrentSource(this.source, this.kodiOpenMedia);
  }
}
