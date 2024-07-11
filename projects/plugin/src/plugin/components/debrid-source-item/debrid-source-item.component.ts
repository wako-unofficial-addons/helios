import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceQuery } from '../../entities/source-query';
import { StreamLinkSource } from '../../entities/stream-link-source';
import { FileSizePipe } from '../../services/file-size.pipe';
import { OpenSourceService } from '../../services/open-source.service';
import { addIcons } from "ionicons";
import { trophyOutline, cubeOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { IonRippleEffect, IonIcon, IonGrid, IonRow, IonCol, IonBadge } from "@ionic/angular/standalone";

@Component({
    selector: 'wk-debrid-source-item',
    templateUrl: 'debrid-source-item.component.html',
    styleUrls: ['debrid-source-item.component.scss'],
    standalone: true,
    imports: [NgIf, FileSizePipe, IonRippleEffect, IonIcon, IonGrid, IonRow, IonCol, IonBadge],
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
        addIcons({ trophyOutline, cubeOutline, ellipsisVerticalOutline });
    }

    async download() {
        await this.openSourceService.openStreamLinkSource(this.source, this.sourceQuery, this.kodiOpenMedia, 'default');
    }

    async more() {
        await this.openSourceService.openStreamLinkSource(this.source, this.sourceQuery, this.kodiOpenMedia, 'more');
    }
}
