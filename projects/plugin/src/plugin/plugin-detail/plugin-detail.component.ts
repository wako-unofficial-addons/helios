import { Component, Input } from '@angular/core';
import { KodiOpenMedia } from '../entities/kodi-open-media';

@Component({
  selector: 'helios-plugin-detail',
  templateUrl: './plugin-detail.component.html'
})
export class PluginDetailComponent {
  @Input()
  searchInput = '';

  @Input()
  category: 'movie' | 'tv' | 'anime' = 'movie';

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  @Input()
  searchOnOpen = false;

  constructor() {
  }

  onSearch(event: any) {
    console.log('HELIOS', event, event.key.toLowerCase().match('enter'));
    if (event.key.toLowerCase().match('enter')) {
      this.searchInput = event.target.value ? event.target.value : '';
    }
  }
}
