import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { TorrentSource } from '../../entities/torrent-source';
import { FileSizePipe } from '../../services/file-size.pipe';
import { OpenSourceService } from '../../services/open-source.service';
import { addIcons } from "ionicons";
import { trophyOutline, cubeOutline } from "ionicons/icons";
import { IonRippleEffect, IonIcon, IonGrid, IonRow, IonCol, IonBadge } from "@ionic/angular/standalone";

@Component({
    selector: 'wk-torrent-source-item',
    templateUrl: 'torrent-source-item.component.html',
    styleUrls: ['torrent-source-item.component.scss'],
    standalone: true,
    imports: [NgIf, FileSizePipe, IonRippleEffect, IonIcon, IonGrid, IonRow, IonCol, IonBadge],
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
