import { Component, OnInit } from '@angular/core';
import { Playlist, PlaylistVideo } from '@wako-app/mobile-sdk';
import { PluginLoaderService } from '../../services/plugin-loader.service';
import { HeliosPlaylistService } from '../../../../projects/plugin/src/plugin/services/helios-playlist.service';
import { NgIf, NgFor } from '@angular/common';
import { IonButton, IonList, IonListHeader, IonItem, IonLabel } from "@ionic/angular/standalone";

@Component({
    selector: 'app-playlist-list',
    templateUrl: './playlist-list.component.html',
    styleUrls: ['./playlist-list.component.scss'],
    standalone: true,
    imports: [NgIf, NgFor, IonButton, IonList, IonListHeader, IonItem, IonLabel, IonButton, IonList, IonListHeader, IonItem, IonLabel, IonButton, IonList, IonListHeader, IonItem, IonLabel]
})
export class PlaylistListComponent implements OnInit {
    playlists: Playlist[] = [];

    constructor(private heliosPlaylistService: HeliosPlaylistService, private pluginLoader: PluginLoaderService) { }

    async ngOnInit() {
        this.playlists = await this.heliosPlaylistService.getAll();
    }

    openItem(item: PlaylistVideo) {
        const pluginService = this.pluginLoader.getPluginService('plugin.helios');
        pluginService.customAction('resume', item);
    }

    async clearPlaylist() {
        for (const playlist of this.playlists) {
            await this.heliosPlaylistService.delete(playlist);
        }

        this.playlists = await this.heliosPlaylistService.getAll();
    }
}
