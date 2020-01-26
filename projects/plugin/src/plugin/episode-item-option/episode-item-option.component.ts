import { Component } from '@angular/core';
import { Episode, EpisodeDetailBaseComponent, Show } from '@wako-app/mobile-sdk';

@Component({
  templateUrl: './episode-item-option.component.html',
  styleUrls: ['./episode-item-option.component.scss']
})
export class EpisodeItemOptionComponent extends EpisodeDetailBaseComponent {
  show: Show;
  episode: Episode;

  setShowEpisode(show: Show, episode: Episode): any {
    this.show = show;
    this.episode = episode;
  }
}
