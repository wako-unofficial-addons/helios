import { Component } from '@angular/core';
import { Episode, EpisodeDetailBaseComponent, Show } from '@wako-app/mobile-sdk';
import { OpenButtonComponent } from '../open-button/open-button.component';

@Component({
    templateUrl: './episode-button.component.html',
    styleUrls: ['./episode-button.component.scss'],
    standalone: true,
    imports: [OpenButtonComponent]
})
export class EpisodeButtonComponent extends EpisodeDetailBaseComponent {
  show: Show;
  episode: Episode;

  setShowEpisode(show: Show, episode: Episode): any {
    this.show = show;
    this.episode = episode;
  }
}
