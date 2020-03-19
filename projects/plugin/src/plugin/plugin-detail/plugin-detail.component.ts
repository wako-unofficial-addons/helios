import { Component, Input } from '@angular/core';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { SourcePopoverFilterComponent } from '../components/source-popover-filter/source-popover-filter.component';
import { PopoverController } from '@ionic/angular';

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

  @Input()
  showSourceFilter = true;

  constructor(private popoverCtrl: PopoverController) {}

  onSearch(event: any) {
    if (event.key.toLowerCase().match('enter')) {
      this.searchInput = event.target.value ? event.target.value : '';
    }
  }

  async openFilterPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: SourcePopoverFilterComponent,
      event: event
    });

    await popover.present();
  }
}
