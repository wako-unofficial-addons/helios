import { Component, OnInit } from '@angular/core';
import { Playlist, PlaylistVideo } from '@wako-app/mobile-sdk';
import { PluginLoaderService } from '../../services/plugin-loader.service';
import { HeliosPlaylistService } from '../../../../projects/plugin/src/plugin/services/helios-playlist.service';

@Component({
  selector: 'app-playlist-list',
  templateUrl: './playlist-list.component.html',
  styleUrls: ['./playlist-list.component.scss']
})
export class PlaylistListComponent implements OnInit {
  playlists: Playlist[] = [];

  constructor(private heliosPlaylistService: HeliosPlaylistService, private pluginLoader: PluginLoaderService) {}

  async ngOnInit() {
    this.playlists = await this.heliosPlaylistService.getAll();
  }

  openItem(item: PlaylistVideo) {
    const pluginService = this.pluginLoader.getPluginService('plugin.helios');
    pluginService.customAction('resume', item);
  }
}
